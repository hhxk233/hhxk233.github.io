import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

export const PORTFOLIO_EPSILON = 1e-8;

const REQUIRED_COLUMNS = ["Activity Date", "Instrument", "Description", "Trans Code", "Quantity"];
const BUY_CODE = "Buy";
const SELL_CODE = "Sell";

// A transaction export is not an account-return history. In particular, selling
// an open FIFO lot must not erase its realized profit from an account chart.
export const ACCOUNT_HISTORY_UNAVAILABLE =
  "Account return history is not available. The activity export does not contain the broker's account-value or return series.";

export function decodePortfolioCsvBase64(encoded) {
  const decoded = Buffer.from(encoded, "base64");
  const isGzip = decoded.length >= 2 && decoded[0] === 0x1f && decoded[1] === 0x8b;
  return (isGzip ? gunzipSync(decoded) : decoded).toString("utf8");
}

export function createErrorPayload(stage, message, { baselineDate, asOfDate, generatedAt = new Date().toISOString() } = {}) {
  return {
    status: "error",
    stage,
    message,
    baselineDate,
    asOfDate,
    generatedAt,
    holdings: [],
    performance: [],
    failedTickers: [],
  };
}

export function createEmptyPayload(
  message,
  { baselineDate, asOfDate, generatedAt = new Date().toISOString(), failedTickers = [] } = {}
) {
  return {
    status: "empty",
    message,
    baselineDate,
    asOfDate,
    generatedAt,
    holdings: [],
    performance: [],
    failedTickers,
  };
}

export function parsePortfolioTradeRows(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error("CSV file is empty.");
  }

  const header = rows[0].map((column) => (column ?? "").trim());
  const indexByColumn = Object.fromEntries(header.map((column, index) => [column, index]));

  for (const column of REQUIRED_COLUMNS) {
    if (!(column in indexByColumn)) {
      throw new Error(`Missing required column: ${column}`);
    }
  }

  return rows
    .slice(1)
    .flatMap((row, sourceOrder) => {
      const activityDate = normalizeUsDate(readColumn(row, indexByColumn, "Activity Date"));
      const transCode = trimCell(readColumn(row, indexByColumn, "Trans Code"));
      const ticker = trimCell(readColumn(row, indexByColumn, "Instrument"));

      if (!activityDate || !ticker || !isSecurityTradeCode(transCode)) {
        return [];
      }

      const quantity = parseQuantity(readColumn(row, indexByColumn, "Quantity"));
      const price = parseSignedMoney(readOptionalColumn(row, indexByColumn, "Price"));
      const amount = parseSignedMoney(readOptionalColumn(row, indexByColumn, "Amount"));

      if (!Number.isFinite(quantity) || quantity <= PORTFOLIO_EPSILON) {
        return [];
      }

      if (!Number.isFinite(amount) && !Number.isFinite(price)) {
        return [];
      }

      const description = trimCell(readColumn(row, indexByColumn, "Description"));

      return [
        {
          activityDate,
          amount,
          description,
          displayName: extractDisplayName(description) ?? ticker,
          price,
          quantity,
          sourceOrder,
          ticker,
          transCode,
        },
      ];
    })
    .sort(compareTradeRows);
}

export function inspectPortfolioActivityCoverage(csvText) {
  const rows = parseCsv(csvText);
  const header = rows[0]?.map((column) => trimCell(column)) ?? [];
  const indexes = Object.fromEntries(header.map((column, index) => [column, index]));
  const dates = [];
  const excluded = new Set();
  for (const row of rows.slice(1)) {
    const date = normalizeUsDate(readColumn(row, indexes, "Activity Date"));
    if (!date) continue;
    dates.push(date);
    const ticker = trimCell(readColumn(row, indexes, "Instrument"));
    const code = trimCell(readColumn(row, indexes, "Trans Code"));
    const quantity = trimCell(readColumn(row, indexes, "Quantity"));
    // Receipts, transfers, splits, and other share movements cannot be silently
    // discarded. Their direction/cost basis must be reconciled before inclusion.
    if (ticker && quantity && !isSecurityTradeCode(code)) excluded.add(ticker);
  }
  dates.sort();
  return {
    firstActivityDate: dates[0] ?? null,
    lastActivityDate: dates.at(-1) ?? null,
    excludedTickers: [...excluded].sort().map((ticker) => ({
      ticker,
      reason: "Non-trade share movements require reconciliation.",
    })),
  };
}

// Owner-only input. ReturnPct is the broker's cumulative account-return percent
// for one consistent baseline, not dollars, NAV, a daily return, or a fraction.
// Strict columns prevent accidentally publishing values from an activity export.
export function parseBrokerReturnHistory(csvText) {
  const rows = parseCsv(csvText);
  const header = rows[0]?.map((column) => trimCell(column)) ?? [];
  if (header.length !== 2 || !header.includes("Date") || !header.includes("ReturnPct")) {
    throw new Error("Broker return CSV must contain exactly Date and ReturnPct columns.");
  }
  const dateIndex = header.indexOf("Date");
  const returnIndex = header.indexOf("ReturnPct");
  const seen = new Set();
  const points = rows.slice(1).map((row) => {
    const date = trimCell(row[dateIndex]);
    const rawReturn = trimCell(row[returnIndex]);
    if (row.length !== 2 || !isValidIsoDate(date) || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawReturn)) {
      throw new Error("Broker return rows require a valid YYYY-MM-DD date and numeric percent.");
    }
    const returnPct = Number(rawReturn);
    if (!Number.isFinite(returnPct) || seen.has(date)) {
      throw new Error("Broker return history contains an invalid return or duplicate date.");
    }
    seen.add(date);
    return { date, returnPct };
  }).sort((left, right) => left.date.localeCompare(right.date));
  if (points.length < 2) throw new Error("Broker return history requires at least two observations.");
  return points;
}

export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && toIsoDate(date) === value;
}

export async function loadMarketHistoriesForTickers(
  tickers,
  {
    cacheDir,
    cacheTtlMs,
    endDate,
    startDate,
  } = {}
) {
  const historiesByTicker = new Map();
  const failedTickers = [];
  const sortedTickers = [...new Set(tickers)].sort();
  const results = new Array(sortedTickers.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(4, sortedTickers.length) }, async () => {
    while (nextIndex < sortedTickers.length) {
      const index = nextIndex++;
      try {
        results[index] = await loadMarketHistory(sortedTickers[index], { cacheDir, cacheTtlMs, endDate, startDate });
      } catch {
        results[index] = null;
      }
    }
  });
  await Promise.all(workers);
  // Fetches can finish out of order; public output and accounting inputs retain
  // deterministic symbol order regardless of network timing.
  for (const [index, ticker] of sortedTickers.entries()) {
    if (results[index]) {
      historiesByTicker.set(ticker, results[index]);
    } else {
      failedTickers.push({
        ticker,
        reason: "Historical market data was unavailable.",
      });
    }
  }

  return { historiesByTicker, failedTickers };
}

export function buildSanitizedPortfolioPayload({
  asOfDate,
  baselineDate,
  failedTickers = [],
  generatedAt = new Date().toISOString(),
  historiesByTicker,
  trades,
  brokerReturns = [],
  reconstructedHistory = null,
  excludedTickers = [],
  transactionAsOfDate = null,
}) {
  const excludedSymbols = new Set(excludedTickers.map((item) => item.ticker));
  const filteredTrades = trades
    .filter((trade) => trade.activityDate <= asOfDate && historiesByTicker.has(trade.ticker) && !excludedSymbols.has(trade.ticker))
    .sort(compareTradeRows);

  const priceLookupsByTicker = buildPortfolioPriceLookups(historiesByTicker, baselineDate, asOfDate);
  const currentPositions = buildOpenPositionsByTicker(filteredTrades, asOfDate, historiesByTicker);
  const currentSnapshot = summarizeOpenPositions(currentPositions, priceLookupsByTicker, asOfDate);

  const currentHoldings = currentSnapshot.holdings.sort((left, right) => right.marketValue - left.marketValue);
  const latestTradingDate = resolveLatestTradingDate(currentHoldings);
  const previousTradingDate = resolvePreviousTradingDate(currentHoldings, priceLookupsByTicker, latestTradingDate);
  const holdingsDayChange = calculateCurrentPortfolioDayChange(currentHoldings, priceLookupsByTicker, latestTradingDate, previousTradingDate);
  const unrealizedReturnFraction =
    currentSnapshot.totalCostBasis > PORTFOLIO_EPSILON
      ? currentSnapshot.totalMarketValue / currentSnapshot.totalCostBasis - 1
      : null;
  // Never synthesize the account curve from an open-position cost-basis ratio.
  // Copy only the two public fields even if a caller passes extra private data.
  const hasBrokerHistory = brokerReturns.length >= 2;
  const history = hasBrokerHistory ? brokerReturns : reconstructedHistory?.performance ?? [];
  const performance = history.map(({ date, returnPct }) => ({ date, returnPct }));
  const hasAccountHistory = performance.length >= 2;

  return {
    schemaVersion: 2,
    status: failedTickers.length || excludedTickers.length ? "partial" : "ready",
    baselineDate,
    asOfDate,
    transactionAsOfDate,
    latestTradingDate,
    generatedAt,
    performanceStatus: hasAccountHistory ? "ready" : "unavailable",
    performanceSource: hasAccountHistory ? (hasBrokerHistory ? "broker-return-history" : "reconstructed-activity") : null,
    performanceMethod: hasAccountHistory && !hasBrokerHistory ? reconstructedHistory.performanceMethod : null,
    performanceMessage: hasAccountHistory ? (hasBrokerHistory ? null : reconstructedHistory.performanceMessage) : ACCOUNT_HISTORY_UNAVAILABLE,
    summary: {
      accountReturnPct: hasAccountHistory ? performance.at(-1).returnPct : null,
      unrealizedReturnPct: unrealizedReturnFraction === null ? null : round(unrealizedReturnFraction * 100, 2),
      holdingsDayChangePct: holdingsDayChange === null ? null : round(holdingsDayChange * 100, 2),
      holdingsCount: currentHoldings.length,
    },
    holdings: currentHoldings.map((holding) => ({
      ticker: holding.ticker,
      name: holding.name,
      weightPct: round((holding.marketValue / currentSnapshot.totalMarketValue) * 100, 2),
      currentReturnPct: round(holding.returnFraction * 100, 2),
    })),
    performance: hasAccountHistory ? performance : [],
    failedTickers,
    excludedTickers: excludedTickers.map(({ ticker, reason }) => ({ ticker, reason })),
  };
}

export function buildOpenPositionsByTicker(trades, cutoffDate, historiesByTicker = new Map()) {
  const positionsByTicker = new Map();
  const splitEvents = [...historiesByTicker].flatMap(([ticker, history]) =>
    history.filter((point) => point.splitRatio !== undefined && point.date <= cutoffDate)
      .map(({ date, splitRatio }) => ({ ticker, date, splitRatio }))
  ).sort((left, right) => left.date.localeCompare(right.date) || left.ticker.localeCompare(right.ticker));
  let splitIndex = 0;
  const applySplitsThrough = (date) => {
    while (splitIndex < splitEvents.length && splitEvents[splitIndex].date <= date) {
      const { ticker, splitRatio } = splitEvents[splitIndex++];
      if (!Number.isFinite(splitRatio) || splitRatio <= 0) throw new Error("Market history contains an invalid split ratio.");
      // A split changes shares, not the money invested in each FIFO lot.
      for (const lot of positionsByTicker.get(ticker)?.lots ?? []) lot.quantity *= splitRatio;
    }
  };

  for (const trade of [...trades].sort(compareTradeRows)) {
    if (trade.activityDate > cutoffDate) {
      break;
    }

    applySplitsThrough(trade.activityDate);
    applyTradeToOpenPositions(positionsByTicker, trade);
  }
  applySplitsThrough(cutoffDate);

  return positionsByTicker;
}

export function applyTradeToOpenPositions(positionsByTicker, trade) {
  if (trade.transCode === BUY_CODE) {
    const costBasis = resolveTradeCostBasis(trade);
    const position = ensurePosition(positionsByTicker, trade.ticker, trade.displayName);

    position.lots.push({
      acquiredDate: trade.activityDate,
      costBasis,
      quantity: trade.quantity,
    });

    return;
  }

  if (trade.transCode !== SELL_CODE) {
    return;
  }

  const position = positionsByTicker.get(trade.ticker);
  if (!position) {
    throw new Error(`Sell trade for ${trade.ticker} exceeded the available open quantity.`);
  }

  let remainingQuantity = trade.quantity;
  const nextLots = [];

  for (const lot of position.lots) {
    if (remainingQuantity <= PORTFOLIO_EPSILON) {
      nextLots.push(lot);
      continue;
    }

    const lotQuantity = lot.quantity;
    const soldQuantity = Math.min(lotQuantity, remainingQuantity);
    const remainingLotQuantity = lotQuantity - soldQuantity;
    const soldCostBasis = lot.costBasis * (soldQuantity / lotQuantity);
    const remainingLotCostBasis = lot.costBasis - soldCostBasis;

    remainingQuantity -= soldQuantity;

    if (remainingLotQuantity > PORTFOLIO_EPSILON) {
      nextLots.push({
        ...lot,
        costBasis: remainingLotCostBasis,
        quantity: remainingLotQuantity,
      });
    }
  }

  if (remainingQuantity > 1e-6) {
    throw new Error(`Sell trade for ${trade.ticker} exceeded the available open quantity.`);
  }

  if (nextLots.length) {
    position.lots = nextLots;
  } else {
    positionsByTicker.delete(trade.ticker);
  }
}

export function summarizeOpenPositions(positionsByTicker, priceLookupsByTicker, date) {
  const holdings = [];
  let totalCostBasis = 0;
  let totalMarketValue = 0;

  for (const [ticker, position] of positionsByTicker.entries()) {
    const quantity = sumLotQuantity(position.lots);
    const openCostBasis = sumLotCostBasis(position.lots);

    if (quantity <= PORTFOLIO_EPSILON || openCostBasis <= PORTFOLIO_EPSILON) {
      continue;
    }

    const lookup = priceLookupsByTicker.get(ticker);
    const close = lookup?.byDate.get(date);

    if (!Number.isFinite(close)) {
      continue;
    }

    const marketValue = quantity * close;
    const returnFraction = marketValue / openCostBasis - 1;

    holdings.push({
      latestTradingDate: lookup.latestTradingDate,
      marketValue,
      name: position.displayName,
      openCostBasis,
      quantity,
      returnFraction,
      ticker,
    });

    totalCostBasis += openCostBasis;
    totalMarketValue += marketValue;
  }

  return {
    holdings,
    totalCostBasis,
    totalMarketValue,
  };
}

export function buildPortfolioPriceLookups(historiesByTicker, startDate, endDate) {
  const priceLookupsByTicker = new Map();

  for (const [ticker, history] of historiesByTicker.entries()) {
    const sortedHistory = [...history]
      .filter((point) => point.date <= endDate && Number.isFinite(point.close) && point.close > 0)
      .sort((left, right) => left.date.localeCompare(right.date));

    const actualTradingDates = sortedHistory
      .filter((point) => point.date >= startDate)
      .map((point) => point.date);

    priceLookupsByTicker.set(ticker, {
      byDate: buildForwardFilledCloseMap(sortedHistory, startDate, endDate),
      latestTradingDate: actualTradingDates.at(-1) ?? null,
      tradingDates: actualTradingDates,
      splitEvents: sortedHistory.filter((point) => point.splitRatio !== undefined)
        .map(({ date, splitRatio }) => ({ date, splitRatio })),
    });
  }

  return priceLookupsByTicker;
}

export function listCalendarDates(startDate, endDate) {
  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = shiftIsoDate(currentDate, 1);
  }

  return dates;
}

export function shiftIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function toUsMarketDate(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function ensurePosition(positionsByTicker, ticker, displayName) {
  const existing = positionsByTicker.get(ticker);
  if (existing) {
    if (displayName && !existing.displayName) {
      existing.displayName = displayName;
    }
    return existing;
  }

  const nextPosition = {
    displayName: displayName || ticker,
    lots: [],
  };

  positionsByTicker.set(ticker, nextPosition);
  return nextPosition;
}

function calculateCurrentPortfolioDayChange(holdings, priceLookupsByTicker, latestTradingDate, previousTradingDate) {
  if (!latestTradingDate || !previousTradingDate) {
    return null;
  }

  let latestMarketValue = 0;
  let previousMarketValue = 0;

  for (const holding of holdings) {
    const lookup = priceLookupsByTicker.get(holding.ticker);
    const latestClose = lookup?.byDate.get(latestTradingDate);
    const previousClose = lookup?.byDate.get(previousTradingDate);

    if (!Number.isFinite(latestClose) || !Number.isFinite(previousClose)) {
      continue;
    }

    let splitRatio = 1;
    for (const event of lookup.splitEvents ?? []) {
      if (event.date > previousTradingDate && event.date <= latestTradingDate) {
        if (!Number.isFinite(event.splitRatio) || event.splitRatio <= 0) throw new Error("Market history contains an invalid split ratio.");
        splitRatio *= event.splitRatio;
      }
    }
    latestMarketValue += holding.quantity * latestClose;
    // Compare both dates per current share, so a split cannot create a price loss.
    previousMarketValue += holding.quantity * (previousClose / splitRatio);
  }

  if (previousMarketValue <= PORTFOLIO_EPSILON) {
    return null;
  }

  return latestMarketValue / previousMarketValue - 1;
}

function resolveLatestTradingDate(holdings) {
  return holdings
    .map((holding) => holding.latestTradingDate)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function resolvePreviousTradingDate(holdings, priceLookupsByTicker, latestTradingDate) {
  if (!latestTradingDate) {
    return null;
  }

  const priorDates = new Set();
  for (const holding of holdings) {
    const lookup = priceLookupsByTicker.get(holding.ticker);
    for (const date of lookup?.tradingDates ?? []) {
      if (date < latestTradingDate) {
        priorDates.add(date);
      }
    }
  }

  return [...priorDates].sort().at(-1) ?? null;
}

function buildForwardFilledCloseMap(history, startDate, endDate) {
  const byDate = new Map();
  let historyIndex = 0;
  let lastClose = null;

  for (const date of listCalendarDates(startDate, endDate)) {
    while (historyIndex < history.length && history[historyIndex].date <= date) {
      lastClose = history[historyIndex].close;
      historyIndex += 1;
    }

    if (Number.isFinite(lastClose)) {
      byDate.set(date, lastClose);
    }
  }

  return byDate;
}

function resolveTradeCostBasis(trade) {
  if (Number.isFinite(trade.amount)) {
    return Math.abs(trade.amount);
  }

  if (Number.isFinite(trade.price)) {
    return trade.quantity * trade.price;
  }

  throw new Error(`Missing cost basis inputs for buy trade ${trade.ticker} on ${trade.activityDate}.`);
}

function sumLotQuantity(lots) {
  return lots.reduce((total, lot) => total + lot.quantity, 0);
}

function sumLotCostBasis(lots) {
  return lots.reduce((total, lot) => total + lot.costBasis, 0);
}

function isSecurityTradeCode(transCode) {
  return transCode === BUY_CODE || transCode === SELL_CODE;
}

function compareTradeRows(left, right) {
  if (left.activityDate !== right.activityDate) {
    return left.activityDate.localeCompare(right.activityDate);
  }

  // Robinhood exports newest rows first, including transactions that share a date.
  // Reverse the source order so FIFO accounting replays same-day trades chronologically.
  return right.sourceOrder - left.sourceOrder;
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

export function parseCsv(text) {
  const rows = [];
  let currentRow = [];
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
      currentRow.push(field);
      field = "";
    } else if (character === "\n") {
      currentRow.push(field);
      rows.push(currentRow);
      currentRow = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length || currentRow.length) {
    currentRow.push(field);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value !== ""));
}

function trimCell(value) {
  return (value ?? "").trim();
}

function readColumn(row, indexByColumn, column) {
  return row[indexByColumn[column]];
}

function readOptionalColumn(row, indexByColumn, column) {
  const index = indexByColumn[column];
  return typeof index === "number" ? row[index] : undefined;
}

function parseQuantity(rawValue) {
  if (!rawValue) {
    return null;
  }

  const normalized = String(rawValue).replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const quantity = Number(normalized);
  return Number.isFinite(quantity) ? quantity : null;
}

export function parseSignedMoney(rawValue) {
  if (!rawValue) {
    return null;
  }

  const normalized = String(rawValue).trim();
  if (!normalized) {
    return null;
  }

  const isParenthesized = normalized.includes("(") && normalized.includes(")");
  const cleaned = normalized.replace(/[$,()\s]/g, "");
  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return isParenthesized ? -Math.abs(numericValue) : numericValue;
}

export function normalizeUsDate(rawValue) {
  if (!rawValue) {
    return null;
  }

  const parts = String(rawValue).split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [month, day, year] = parts;
  if (!month || !day || !year) {
    return null;
  }

  const result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidIsoDate(result) ? result : null;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function loadMarketHistory(
  ticker,
  {
    cacheDir,
    cacheTtlMs = 12 * 60 * 60 * 1000,
    endDate,
    startDate,
  } = {}
) {
  const cachePath = cacheDir ? path.join(cacheDir, `${ticker}.json`) : null;
  const cached = cachePath ? await readCache(cachePath, cacheTtlMs, { startDate, endDate }) : null;
  if (cached) {
    return cached;
  }

  const period1 = toUnixSeconds(startDate);
  const period2 = toUnixSeconds(shiftIsoDate(endDate, 1));
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false&events=div%2Csplits`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart request failed for ${ticker}.`);
  }

  const payload = await response.json();
  const history = parseMarketHistoryResponse(payload);

  if (!history.length) {
    throw new Error(`No price history returned for ${ticker}.`);
  }

  if (cachePath) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(
      cachePath,
      `${JSON.stringify({ version: "raw-share-prices-v1", fetchedAt: Date.now(), startDate, endDate, history }, null, 2)}\n`,
      "utf8"
    );
  }

  return history;
}

export function parseMarketHistoryResponse(payload) {
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const splitEvents = Object.values(result?.events?.splits ?? {}).map((event) => {
    const numerator = Number(event.numerator);
    const denominator = Number(event.denominator);
    const splitRatio = numerator / denominator;
    const timestamp = Number(event.date);
    if (!Number.isFinite(timestamp) || !Number.isFinite(numerator) || !Number.isFinite(denominator) ||
        numerator <= 0 || denominator <= 0 || !Number.isFinite(splitRatio) || splitRatio <= 0) {
      throw new Error("Historical market data contained an invalid stock split.");
    }
    return { date: toIsoDate(new Date(timestamp * 1000)), splitRatio };
  });

  const history = timestamps
    .flatMap((timestamp, index) => {
      const close = closes[index];
      if (!Number.isFinite(timestamp) || !Number.isFinite(close) || close <= 0) return [];
      const date = toIsoDate(new Date(timestamp * 1000));
      // Yahoo's quote.close is split-adjusted. Reconstruct the price per share
      // that actually existed on this date, including splits after the report
      // cutoff. Dividends are deliberately not adjusted here: the cash ledger
      // already records them.
      const laterSplits = splitEvents.filter((event) => event.date > date);
      const factor = laterSplits.reduce((product, event) => product * event.splitRatio, 1);
      const rawClose = close * factor;
      if (!Number.isFinite(rawClose) || rawClose <= 0) {
        throw new Error("Stock-split normalization produced an invalid historical price.");
      }
      const sameDaySplits = splitEvents.filter((event) => event.date === date);
      const point = { date, close: rawClose };
      if (sameDaySplits.length) {
        point.splitRatio = sameDaySplits.reduce((product, event) => product * event.splitRatio, 1);
        if (!Number.isFinite(point.splitRatio) || point.splitRatio <= 0) {
          throw new Error("Historical market data contained an invalid combined stock split.");
        }
      }
      return [point];
    })
    .sort((left, right) => left.date.localeCompare(right.date));
  // Do not silently lose a share-quantity adjustment when a split-day quote is
  // missing from an otherwise covered history.
  const dates = new Set(history.map((point) => point.date));
  for (const event of splitEvents) {
    if (history.length && event.date >= history[0].date && event.date <= history.at(-1).date && !dates.has(event.date)) {
      throw new Error("A stock-split date is missing its historical market price.");
    }
  }
  return history;
}

async function readCache(cachePath, cacheTtlMs, { startDate, endDate }) {
  try {
    const cacheText = await fs.readFile(cachePath, "utf8");
    const cache = JSON.parse(cacheText);
    if (cache.version !== "raw-share-prices-v1" || !Number.isFinite(cache.fetchedAt) ||
        Date.now() - cache.fetchedAt > cacheTtlMs || cache.fetchedAt > Date.now() ||
        !isValidIsoDate(cache.startDate) || !isValidIsoDate(cache.endDate) ||
        cache.startDate > startDate || cache.endDate < endDate) {
      return null;
    }
    if (!Array.isArray(cache.history) || !cache.history.length || cache.history.some((point) =>
      !isValidIsoDate(point.date) || !Number.isFinite(point.close) || point.close <= 0 ||
      (point.splitRatio !== undefined && (!Number.isFinite(point.splitRatio) || point.splitRatio <= 0))
    )) return null;
    return cache.history;
  } catch {
    return null;
  }
}

function toUnixSeconds(isoDate) {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}
