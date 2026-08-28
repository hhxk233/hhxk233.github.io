import fs from "node:fs/promises";
import path from "node:path";
import {
  buildSanitizedPortfolioPayload,
  createEmptyPayload,
  createErrorPayload,
  decodePortfolioCsvBase64,
  loadMarketHistoriesForTickers,
  parsePortfolioTradeRows,
  shiftIsoDate,
  toIsoDate,
} from "./portfolio-lib.mjs";

const BASELINE_DATE = process.env.PORTFOLIO_BASELINE_DATE ?? "2026-02-02";
const AS_OF_DATE = process.env.PORTFOLIO_AS_OF_DATE ?? toIsoDate(new Date());
const INPUT_CSV = process.env.PORTFOLIO_TRADES_CSV;
const INPUT_CSV_TEXT = process.env.PORTFOLIO_TRADES_CSV_TEXT;
const INPUT_CSV_B64 = process.env.PORTFOLIO_TRADES_CSV_B64 ?? process.env.PORTFOLIO_TRADES_CSV_BASE64;
const OUTPUT_JSON = process.env.PORTFOLIO_OUTPUT_JSON ?? path.join("assets", "json", "portfolio-data.json");
const CACHE_DIR = process.env.PORTFOLIO_MARKET_DATA_CACHE_DIR ?? path.join(".cache", "portfolio-market-data");
const CACHE_TTL_MS = Number(process.env.PORTFOLIO_MARKET_DATA_CACHE_TTL_HOURS ?? 12) * 60 * 60 * 1000;
const GENERATED_AT = new Date().toISOString();

async function main() {
  if (!INPUT_CSV && !INPUT_CSV_TEXT && !INPUT_CSV_B64) {
    await writePayload(
      createErrorPayload(
        "holdings",
        "Set PORTFOLIO_TRADES_CSV, PORTFOLIO_TRADES_CSV_TEXT, or PORTFOLIO_TRADES_CSV_B64 before generating portfolio data.",
        { asOfDate: AS_OF_DATE, baselineDate: BASELINE_DATE, generatedAt: GENERATED_AT }
      )
    );
    throw new Error("A private Robinhood trade history input is required.");
  }

  try {
    const csvText = await loadCsvText();
    const trades = parsePortfolioTradeRows(csvText);

    if (!trades.length) {
      await writePayload(
        createEmptyPayload("No buy or sell transactions were reconstructed from the provided trade history.", {
          asOfDate: AS_OF_DATE,
          baselineDate: BASELINE_DATE,
          generatedAt: GENERATED_AT,
        })
      );
      return;
    }

    const tickers = [...new Set(trades.map((trade) => trade.ticker))];
    const { failedTickers, historiesByTicker } = await loadMarketHistoriesForTickers(tickers, {
      cacheDir: CACHE_DIR,
      cacheTtlMs: CACHE_TTL_MS,
      endDate: AS_OF_DATE,
      startDate: shiftIsoDate(BASELINE_DATE, -7),
    });

    if (!historiesByTicker.size) {
      await writePayload(
        createErrorPayload(
          "market",
          "Historical market data could not be loaded for the reconstructed holdings.",
          { asOfDate: AS_OF_DATE, baselineDate: BASELINE_DATE, generatedAt: GENERATED_AT }
        )
      );
      return;
    }

    const payload = buildSanitizedPortfolioPayload({
      asOfDate: AS_OF_DATE,
      baselineDate: BASELINE_DATE,
      failedTickers,
      generatedAt: GENERATED_AT,
      historiesByTicker,
      trades,
    });
    await writePayload(payload);

    const holdingsCount = payload.summary?.holdingsCount ?? 0;
    console.log(
      `Generated sanitized portfolio data (${payload.status}) for ${holdingsCount} holdings at ${OUTPUT_JSON}.`
    );
  } catch (error) {
    await writePayload(
      createErrorPayload(
        "holdings",
        "The holdings file could not be parsed into a sanitized portfolio dataset.",
        { asOfDate: AS_OF_DATE, baselineDate: BASELINE_DATE, generatedAt: GENERATED_AT }
      )
    );
    throw error;
  }
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
