import fs from "node:fs/promises";
import path from "node:path";
import { parseAccountActivity, reconstructAccountHistory } from "./account-history.mjs";
import {
  buildSanitizedPortfolioPayload,
  decodePortfolioCsvBase64,
  inspectPortfolioActivityCoverage,
  loadMarketHistoriesForTickers,
  parseBrokerReturnHistory,
  parsePortfolioTradeRows,
  shiftIsoDate,
  toIsoDate,
} from "./portfolio-lib.mjs";

const BASELINE_DATE = process.env.PORTFOLIO_BASELINE_DATE ?? "2026-02-02";
const AS_OF_DATE = process.env.PORTFOLIO_AS_OF_DATE ?? toIsoDate(new Date());
const INPUT_CSV = process.env.PORTFOLIO_TRADES_CSV;
const INPUT_CSV_TEXT = process.env.PORTFOLIO_TRADES_CSV_TEXT;
const INPUT_CSV_B64 = process.env.PORTFOLIO_TRADES_CSV_B64 ?? process.env.PORTFOLIO_TRADES_CSV_BASE64;
const INPUT_RETURNS_CSV = process.env.PORTFOLIO_RETURNS_CSV;
const OUTPUT_JSON = process.env.PORTFOLIO_OUTPUT_JSON ?? path.join("assets", "json", "portfolio-data.json");
const CACHE_DIR = process.env.PORTFOLIO_MARKET_DATA_CACHE_DIR ?? path.join(".cache", "portfolio-market-data");
const CACHE_TTL_MS = Number(process.env.PORTFOLIO_MARKET_DATA_CACHE_TTL_HOURS ?? 12) * 60 * 60 * 1000;
const GENERATED_AT = new Date().toISOString();

async function main() {
  if (!INPUT_CSV && !INPUT_CSV_TEXT && !INPUT_CSV_B64) {
    throw new Error("A private Robinhood trade history input is required.");
  }

  try {
    const csvText = await loadCsvText();
    const trades = parsePortfolioTradeRows(csvText);
    const coverage = inspectPortfolioActivityCoverage(csvText);
    if (!coverage.lastActivityDate) throw new Error("No dated activity was found in the private input.");
    const existing = await readExistingPayload();
    // Scheduled jobs may still hold an older private export. Do not let that
    // stale input replace a newer locally reviewed, sanitized snapshot.
    if (existing?.schemaVersion === 2 && existing.transactionAsOfDate > coverage.lastActivityDate) {
      if (INPUT_RETURNS_CSV) {
        throw new Error(
          "Return-history import requires an activity export at least as recent as the existing snapshot. Existing data was preserved."
        );
      }
      console.log("Skipped older activity input; retained the newer sanitized portfolio snapshot.");
      return;
    }
    const brokerReturns = await loadBrokerReturns(existing);
    // Keep valuing the latest reported positions each day. The activity cutoff
    // remains separate, and reconstruction discloses the unchanged cash/holdings
    // assumption for dates beyond that report.
    const valuationDate = AS_OF_DATE;
    const activities = parseAccountActivity(csvText);
    const tickers = [...new Set(activities.filter((row) => row.quantity && row.ticker).map((row) => row.ticker))];
    const { failedTickers, historiesByTicker } = await loadMarketHistoriesForTickers(tickers, {
      cacheDir: CACHE_DIR,
      cacheTtlMs: CACHE_TTL_MS,
      endDate: AS_OF_DATE,
      startDate: shiftIsoDate([BASELINE_DATE, coverage.firstActivityDate].sort()[0], -7),
    });

    let reconstructedHistory = null;
    if (brokerReturns.length < 2) {
      reconstructedHistory = reconstructAccountHistory({ activities, historiesByTicker, baselineDate: BASELINE_DATE, asOfDate: valuationDate });
    }
    const payload = buildSanitizedPortfolioPayload({
      asOfDate: valuationDate,
      baselineDate: BASELINE_DATE,
      failedTickers,
      generatedAt: GENERATED_AT,
      historiesByTicker,
      trades,
      brokerReturns,
      reconstructedHistory,
      excludedTickers: coverage.excludedTickers,
      transactionAsOfDate: coverage.lastActivityDate,
    });
    await writePayload(payload);

    const holdingsCount = payload.summary?.holdingsCount ?? 0;
    console.log(`Generated sanitized portfolio data (${payload.status}) for ${holdingsCount} holdings at ${OUTPUT_JSON}.`);
  } catch (error) {
    // Preserve the last reviewed snapshot on parse/accounting failures.
    throw error;
  }
}

async function readExistingPayload() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_JSON, "utf8"));
  } catch {
    return null;
  }
}

async function loadBrokerReturns(existing) {
  if (INPUT_RETURNS_CSV) return parseBrokerReturnHistory(await fs.readFile(INPUT_RETURNS_CSV, "utf8"));
  // Version 1 performance is the erroneous unrealized-position ratio. It must
  // never be promoted to broker account history during a routine refresh.
  if (existing?.schemaVersion === 2 && existing.performanceSource === "broker-return-history" && existing.performanceStatus === "ready") {
    return parseBrokerReturnHistory(["Date,ReturnPct", ...existing.performance.map((point) => `${point.date},${point.returnPct}`)].join("\n"));
  }
  return [];
}

async function writePayload(payload) {
  const outputDir = path.dirname(OUTPUT_JSON);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function loadCsvText() {
  if (INPUT_CSV_TEXT) {
    return INPUT_CSV_TEXT;
  }

  if (INPUT_CSV_B64) {
    return decodePortfolioCsvBase64(INPUT_CSV_B64);
  }

  return fs.readFile(INPUT_CSV, "utf8");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
