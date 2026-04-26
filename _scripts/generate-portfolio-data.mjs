import fs from "node:fs/promises";
import path from "node:path";

const BASELINE_DATE = process.env.PORTFOLIO_BASELINE_DATE ?? "2026-02-02";
const AS_OF_DATE = process.env.PORTFOLIO_AS_OF_DATE ?? toIsoDate(new Date());
const INPUT_CSV = process.env.PORTFOLIO_TRADES_CSV;
const OUTPUT_JSON = process.env.PORTFOLIO_OUTPUT_JSON ?? path.join("assets", "json", "portfolio-data.json");
const CACHE_DIR = process.env.PORTFOLIO_MARKET_DATA_CACHE_DIR ?? path.join(".cache", "portfolio-market-data");
const CACHE_TTL_MS = Number(process.env.PORTFOLIO_MARKET_DATA_CACHE_TTL_HOURS ?? 12) * 60 * 60 * 1000;

async function main() {
  if (!INPUT_CSV) {
    await writePayload(
      createErrorPayload(
        "holdings",
        "Set PORTFOLIO_TRADES_CSV to a Robinhood trade history export before generating portfolio data."
      )
    );
    throw new Error("PORTFOLIO_TRADES_CSV is required.");
  }

  try {
    const csvText = await fs.readFile(INPUT_CSV, "utf8");
    const trades = parseTradeRows(csvText);
    const holdings = deriveHoldings(trades);

    if (!holdings.length) {
      await writePayload(createEmptyPayload("No active holdings were reconstructed from the provided trade history."));
      return;
    }

    const { validHoldings, failedTickers } = await enrichHoldingsWithMarketData(holdings);

    if (!validHoldings.length) {
      await writePayload(
        createErrorPayload(
          "market",
          "Historical market data could not be loaded for the reconstructed holdings."
        )
      );
      return;
    }

    const payload = buildPortfolioPayload(validHoldings, failedTickers);
    await writePayload(payload);

    console.log(
      `Generated sanitized portfolio data for ${payload.summary.holdingsCount} holdings at ${OUTPUT_JSON}.`
    );
  } catch (error) {
    await writePayload(
      createErrorPayload(
        "holdings",
        "The holdings file could not be parsed into a sanitized portfolio dataset."
      )
    );
    throw error;
  }
}

function createErrorPayload(stage, message) {
  return {
    status: "error",
    stage,
    message,
    baselineDate: BASELINE_DATE,
    asOfDate: AS_OF_DATE,
    generatedAt: new Date().toISOString(),
    holdings: [],
    performance: [],
    failedTickers: [],
  };
}

function createEmptyPayload(message) {
  return {
    status: "empty",
    message,
    baselineDate: BASELINE_DATE,
    asOfDate: AS_OF_DATE,
    generatedAt: new Date().toISOString(),
    holdings: [],
    performance: [],
    failedTickers: [],
  };
}

async function writePayload(payload) {
  const outputDir = path.dirname(OUTPUT_JSON);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseTradeRows(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error("CSV file is empty.");
  }

  const header = rows[0];
  const requiredColumns = ["Activity Date", "Instrument", "Description", "Trans Code", "Quantity"];
  const indexByColumn = Object.fromEntries(header.map((column, index) => [column, index]));

  for (const column of requiredColumns) {
    if (!(column in indexByColumn)) {
      throw new Error(`Missing required column: ${column}`);
    }
  }

  return rows.slice(1).map((row) => ({
    activityDate: normalizeUsDate(row[indexByColumn["Activity Date"]]),
    instrument: (row[indexByColumn["Instrument"]] ?? "").trim(),
    description: (row[indexByColumn["Description"]] ?? "").trim(),
    transCode: (row[indexByColumn["Trans Code"]] ?? "").trim(),
    quantity: parseNumber(row[indexByColumn["Quantity"]]),
  }));
}

function deriveHoldings(trades) {
  const holdingsByTicker = new Map();
  const nameByTicker = new Map();

  for (const trade of trades) {
    if (trade.instrument) {
      const displayName = extractDisplayName(trade.description);
      if (displayName && !nameByTicker.has(trade.instrument)) {
        nameByTicker.set(trade.instrument, displayName);
      }
    }

    if (!trade.instrument || !Number.isFinite(trade.quantity)) {
      continue;
    }

    const quantityDelta =
      trade.transCode === "Buy" ? trade.quantity : trade.transCode === "Sell" ? -trade.quantity : 0;

    if (!quantityDelta) {
      continue;
    }

    holdingsByTicker.set(trade.instrument, (holdingsByTicker.get(trade.instrument) ?? 0) + quantityDelta);
  }

  return [...holdingsByTicker.entries()]
    .filter(([, quantity]) => quantity > 1e-8)
    .map(([ticker, quantity]) => ({
      ticker,
      displayName: nameByTicker.get(ticker) ?? ticker,
      quantity,
    }))
    .sort((left, right) => left.ticker.localeCompare(right.ticker));
}

async function enrichHoldingsWithMarketData(holdings) {
  const validHoldings = [];
  const failedTickers = [];

  for (const holding of holdings) {
    try {
      const history = await loadMarketHistory(holding.ticker);
      const trimmedHistory = history.filter((point) => point.date <= AS_OF_DATE);
      const baselineClose = getCloseOnOrBefore(trimmedHistory, BASELINE_DATE);
      const currentClose = getCloseOnOrBefore(trimmedHistory, AS_OF_DATE);

      if (!Number.isFinite(baselineClose) || !Number.isFinite(currentClose)) {
        failedTickers.push({
          ticker: holding.ticker,
          reason: "Missing a baseline or current close price.",
        });
        continue;
      }

      const filledCloses = buildForwardFilledCloses(trimmedHistory, BASELINE_DATE, AS_OF_DATE);

      validHoldings.push({
        ...holding,
        baselineClose,
        currentClose,
        currentMarketValue: currentClose * holding.quantity,
        latestTradingDate: trimmedHistory[trimmedHistory.length - 1]?.date ?? null,
        history: trimmedHistory,
        filledCloses,
      });
    } catch (error) {
      failedTickers.push({
        ticker: holding.ticker,
        reason: "Historical market data was unavailable.",
      });
    }
  }

  return { validHoldings, failedTickers };
}

async function loadMarketHistory(ticker) {
  const cachePath = path.join(CACHE_DIR, `${ticker}.json`);
  const cached = await readCache(cachePath);
  if (cached) {
    return cached;
  }

  const startDate = shiftIsoDate(BASELINE_DATE, -7);
  const period1 = toUnixSeconds(startDate);
  const period2 = toUnixSeconds(shiftIsoDate(AS_OF_DATE, 1));
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false&events=div%2Csplits`;

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart request failed for ${ticker}.`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const history = timestamps
    .map((timestamp, index) => ({
      date: toIsoDate(new Date(timestamp * 1000)),
      close: Number(closes[index]),
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (!history.length) {
    throw new Error(`No price history returned for ${ticker}.`);
  }

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    cachePath,
    `${JSON.stringify({ fetchedAt: Date.now(), history }, null, 2)}\n`,
    "utf8"
  );

  return history;
}

async function readCache(cachePath) {
  try {
    const cacheText = await fs.readFile(cachePath, "utf8");
    const cache = JSON.parse(cacheText);
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      return null;
    }
    return Array.isArray(cache.history) ? cache.history : null;
  } catch {
    return null;
  }
}

function buildPortfolioPayload(validHoldings, failedTickers) {
  const totalMarketValue = validHoldings.reduce((sum, holding) => sum + holding.currentMarketValue, 0);
  const latestTradingDate = validHoldings
    .map((holding) => holding.latestTradingDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  const weightedHoldings = validHoldings
    .map((holding) => {
      const weightFraction = holding.currentMarketValue / totalMarketValue;
      const currentReturnFraction = holding.currentClose / holding.baselineClose - 1;

      return {
        ...holding,
        weightFraction,
        currentReturnFraction,
      };
    })
    .sort((left, right) => right.weightFraction - left.weightFraction);

  const calendarDates = listCalendarDates(BASELINE_DATE, AS_OF_DATE);
  const performanceFractions = calendarDates.map((date) => {
    let returnFraction = 0;
    for (const holding of weightedHoldings) {
      const close = holding.filledCloses.get(date);
      returnFraction += holding.weightFraction * (close / holding.baselineClose - 1);
    }
    return { date, returnFraction };
  });

  const tradingDates = [
    ...new Set(
      weightedHoldings.flatMap((holding) =>
        holding.history.filter((point) => point.date >= BASELINE_DATE && point.date <= AS_OF_DATE).map((point) => point.date)
      )
    ),
  ].sort();

  const latestTradingDayChangeFraction = calculateLatestTradingDayChange(weightedHoldings, tradingDates);
  const maxDrawdownFraction = calculateMaxDrawdown(performanceFractions);
  const currentReturnFraction = performanceFractions.at(-1)?.returnFraction ?? 0;

  return {
    status: failedTickers.length ? "partial" : "ready",
    baselineDate: BASELINE_DATE,
    asOfDate: AS_OF_DATE,
    latestTradingDate,
    generatedAt: new Date().toISOString(),
    summary: {
      currentReturnPct: round(currentReturnFraction * 100, 2),
      latestTradingDayChangePct: round(latestTradingDayChangeFraction * 100, 2),
      maxDrawdownPct: round(maxDrawdownFraction * 100, 2),
      holdingsCount: weightedHoldings.length,
    },
    holdings: weightedHoldings.map((holding) => ({
      ticker: holding.ticker,
      name: holding.displayName,
      weightPct: round(holding.weightFraction * 100, 2),
      currentReturnPct: round(holding.currentReturnFraction * 100, 2),
    })),
    performance: performanceFractions.map((point) => ({
      date: point.date,
      returnPct: round(point.returnFraction * 100, 4),
    })),
    failedTickers,
  };
}

function calculateLatestTradingDayChange(weightedHoldings, tradingDates) {
  if (tradingDates.length < 2) {
    return 0;
  }

  const latestDate = tradingDates.at(-1);
  const previousDate = tradingDates.at(-2);
  const latestValue = portfolioValueFactor(weightedHoldings, latestDate);
  const previousValue = portfolioValueFactor(weightedHoldings, previousDate);

  if (!Number.isFinite(latestValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return 0;
  }

  return latestValue / previousValue - 1;
}

function portfolioValueFactor(weightedHoldings, date) {
  let total = 0;
  for (const holding of weightedHoldings) {
    const close = holding.filledCloses.get(date);
    total += holding.weightFraction * (close / holding.baselineClose);
  }
  return total;
}

function calculateMaxDrawdown(performanceFractions) {
  let peak = 1;
  let maxDrawdown = 0;

  for (const point of performanceFractions) {
    const equity = 1 + point.returnFraction;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity / peak - 1);
  }

  return maxDrawdown;
}

function buildForwardFilledCloses(history, startDate, endDate) {
  const filled = new Map();
  const calendarDates = listCalendarDates(startDate, endDate);
  let historyIndex = 0;
  let lastClose = null;

  for (const date of calendarDates) {
    while (historyIndex < history.length && history[historyIndex].date <= date) {
      lastClose = history[historyIndex].close;
      historyIndex += 1;
    }

    if (!Number.isFinite(lastClose)) {
      throw new Error("Cannot forward-fill prices without an initial close.");
    }

    filled.set(date, lastClose);
  }

  return filled;
}

function getCloseOnOrBefore(history, targetDate) {
  let lastClose = null;
  for (const point of history) {
    if (point.date > targetDate) {
      break;
    }
    lastClose = point.close;
  }
  return lastClose;
}

function extractDisplayName(description) {
  if (!description) {
    return null;
  }

  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }

  const blockedPrefixes = ["Cash Div:", "Foreign Tax", "Stock Lending", "ADR Fee", "ACH ", "Instant bank"];
  if (blockedPrefixes.some((prefix) => firstLine.startsWith(prefix))) {
    return null;
  }

  return firstLine;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (inQuotes) {
      if (character === '"') {
        if (nextCharacter === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => value !== ""));
}

function parseNumber(rawValue) {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.replace(/[$,()]/g, "");
  return Number(normalized);
}

function normalizeUsDate(rawValue) {
  if (!rawValue) {
    return null;
  }

  const [month, day, year] = rawValue.split("/").map(Number);
  if (!month || !day || !year) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function listCalendarDates(startDate, endDate) {
  const dates = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = shiftIsoDate(current, 1);
  }

  return dates;
}

function shiftIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function toUnixSeconds(isoDate) {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
