import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  applyTradeToOpenPositions,
  buildOpenPositionsByTicker,
  buildPortfolioPriceLookups,
  buildSanitizedPortfolioPayload,
  decodePortfolioCsvBase64,
  inspectPortfolioActivityCoverage,
  parseBrokerReturnHistory,
  parseMarketHistoryResponse,
  parsePortfolioTradeRows,
} from "./portfolio-lib.mjs";

function history(points) {
  return points.map(([date, close]) => ({ date, close }));
}

test("decodePortfolioCsvBase64 accepts plain and gzip-compressed CSV", () => {
  const csv = '"Activity Date","Instrument"\n"8/26/2026","VOO"\n';
  const plain = Buffer.from(csv, "utf8").toString("base64");
  const compressed = gzipSync(Buffer.from(csv, "utf8")).toString("base64");

  assert.equal(decodePortfolioCsvBase64(plain), csv);
  assert.equal(decodePortfolioCsvBase64(compressed), csv);
});

test("parsePortfolioTradeRows ignores non-trade cash flows and footer rows", () => {
  const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"2/2/2026","2/2/2026","2/3/2026","AAA","Alpha Co","Buy","1","$100.00","($100.00)"
"2/3/2026","2/3/2026","2/3/2026","","Cash back from Robinhood Credit Card","XENT_CC","","","$12.00"
"2/4/2026","2/4/2026","2/5/2026","CCC","Core Corp
CUSIP: 123456789
Dividend Reinvestment","Buy","0.2000","$25.00","($5.00)"
"","","","","","","","","","The data provided is for informational purposes only."
`;

  const trades = parsePortfolioTradeRows(csv);

  assert.equal(trades.length, 2);
  assert.deepEqual(
    trades.map((trade) => trade.ticker),
    ["AAA", "CCC"]
  );
  assert.equal(trades[1].displayName, "Core Corp");
});

test("parsePortfolioTradeRows restores chronological order for same-day reverse exports", () => {
  const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"7/13/2026","7/13/2026","7/14/2026","SOXX","iShares Semiconductor ETF","Sell","0.180807","$551.09","$99.64"
"7/13/2026","7/13/2026","7/14/2026","SOXX","iShares Semiconductor ETF","Buy","0.180807","$553.07","($100.00)"
`;

  const trades = parsePortfolioTradeRows(csv);

  assert.deepEqual(
    trades.map((trade) => trade.transCode),
    ["Buy", "Sell"]
  );
  assert.equal(buildOpenPositionsByTicker(trades, "2026-07-13").has("SOXX"), false);
});

test("FIFO lot accounting handles multiple buys, partial sells, and full sells", () => {
  const trades = [
    {
      activityDate: "2026-02-02",
      amount: -100,
      displayName: "Alpha Co",
      quantity: 1,
      sourceOrder: 0,
      ticker: "AAA",
      transCode: "Buy",
    },
    {
      activityDate: "2026-02-05",
      amount: -110,
      displayName: "Alpha Co",
      quantity: 1,
      sourceOrder: 1,
      ticker: "AAA",
      transCode: "Buy",
    },
    {
      activityDate: "2026-02-10",
      amount: 160,
      displayName: "Alpha Co",
      quantity: 1.5,
      sourceOrder: 2,
      ticker: "AAA",
      transCode: "Sell",
    },
    {
      activityDate: "2026-02-12",
      amount: -50,
      displayName: "Beta Co",
      quantity: 1,
      sourceOrder: 3,
      ticker: "BBB",
      transCode: "Buy",
    },
    {
      activityDate: "2026-02-14",
      amount: 52,
      displayName: "Beta Co",
      quantity: 1,
      sourceOrder: 4,
      ticker: "BBB",
      transCode: "Sell",
    },
  ];

  const positions = buildOpenPositionsByTicker(trades, "2026-02-15");
  const alphaLots = positions.get("AAA").lots;

  assert.equal(alphaLots.length, 1);
  assert.equal(alphaLots[0].quantity, 0.5);
  assert.equal(alphaLots[0].costBasis, 55);
  assert.equal(positions.has("BBB"), false);
});

test("snapshot FIFO applies a split before same-day sales and buys while preserving lot basis", () => {
  const trades = [
    { activityDate: "2026-02-02", amount: -200, quantity: 2, transCode: "Buy", ticker: "AAA", sourceOrder: 3 },
    { activityDate: "2026-02-03", amount: -120, quantity: 1, transCode: "Buy", ticker: "AAA", sourceOrder: 2 },
    { activityDate: "2026-02-04", amount: 275, quantity: 5, transCode: "Sell", ticker: "AAA", sourceOrder: 1 },
    { activityDate: "2026-02-04", amount: -55, quantity: 1, transCode: "Buy", ticker: "AAA", sourceOrder: 0 },
  ];
  const histories = new Map([["AAA", [
    { date: "2026-02-02", close: 100 }, { date: "2026-02-03", close: 120 },
    { date: "2026-02-04", close: 55, splitRatio: 2 },
  ]]]);
  const before = buildOpenPositionsByTicker(trades, "2026-02-03", histories).get("AAA").lots;
  assert.deepEqual(before.map(({ quantity, costBasis }) => ({ quantity, costBasis })), [
    { quantity: 2, costBasis: 200 }, { quantity: 1, costBasis: 120 },
  ]);
  const after = buildOpenPositionsByTicker(trades, "2026-02-04", histories).get("AAA").lots;
  assert.deepEqual(after.map(({ quantity, costBasis, acquiredDate }) => ({ quantity, costBasis, acquiredDate })), [
    { quantity: 1, costBasis: 60, acquiredDate: "2026-02-03" },
    { quantity: 1, costBasis: 55, acquiredDate: "2026-02-04" },
  ]);
  assert.equal(trades[0].quantity, 2, "Applying a split must not mutate the source trades");
});

test("post-report splits preserve snapshot value, weights, and the daily price return", async (t) => {
  for (const ratio of [2, 0.1]) {
    await t.test(ratio > 1 ? "forward split" : "reverse split", () => {
      const trades = [
        { activityDate: "2026-02-02", amount: -100, quantity: 1, transCode: "Buy", ticker: "AAA", sourceOrder: 1 },
        { activityDate: "2026-02-02", amount: -100, quantity: 1, transCode: "Buy", ticker: "BBB", sourceOrder: 0 },
      ];
      const historiesByTicker = new Map([
        ["AAA", [
          { date: "2026-02-02", close: 100 }, { date: "2026-02-04", close: 100 / ratio, splitRatio: ratio },
          { date: "2026-02-05", close: 110 / ratio },
        ]],
        ["BBB", history([["2026-02-02", 100], ["2026-02-04", 100], ["2026-02-05", 100]])],
      ]);
      const options = { baselineDate: "2026-02-02", transactionAsOfDate: "2026-02-02", trades, historiesByTicker };
      const splitDay = buildSanitizedPortfolioPayload({ ...options, asOfDate: "2026-02-04" });
      assert.equal(splitDay.summary.unrealizedReturnPct, 0);
      assert.equal(splitDay.summary.holdingsDayChangePct, 0);
      assert.ok(splitDay.holdings.every((holding) => holding.weightPct === 50 && holding.currentReturnPct === 0));
      const lots = buildOpenPositionsByTicker(trades, "2026-02-04", historiesByTicker).get("AAA").lots;
      assert.equal(lots[0].quantity, ratio);
      assert.equal(lots[0].costBasis, 100);

      const nextDay = buildSanitizedPortfolioPayload({ ...options, asOfDate: "2026-02-05" });
      assert.equal(nextDay.summary.unrealizedReturnPct, 5);
      assert.equal(nextDay.summary.holdingsDayChangePct, 5);
      assert.equal(nextDay.holdings.find((holding) => holding.ticker === "AAA").currentReturnPct, 10);
      const weekend = buildSanitizedPortfolioPayload({ ...options, asOfDate: "2026-02-08" });
      assert.equal(weekend.latestTradingDate, "2026-02-05");
      assert.deepEqual(weekend.holdings, nextDay.holdings);
      assert.deepEqual(weekend.summary, nextDay.summary);
    });
  }
});

test("snapshot split replay rejects an invalid ratio", () => {
  const trades = [{ activityDate: "2026-02-02", amount: -100, quantity: 1, transCode: "Buy", ticker: "AAA", sourceOrder: 0 }];
  assert.throws(() => buildOpenPositionsByTicker(trades, "2026-02-04", new Map([["AAA", [
    { date: "2026-02-04", close: 100, splitRatio: 0 },
  ]]])), /invalid split ratio/);
});

test("sanitized payload excludes sold-out holdings and keeps DRIP buy lots", () => {
  const trades = parsePortfolioTradeRows(`"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"2/2/2026","2/2/2026","2/3/2026","AAA","Alpha Co","Buy","1","$100.00","($100.00)"
"2/5/2026","2/5/2026","2/6/2026","AAA","Alpha Co","Sell","0.5","$120.00","$60.00"
"2/6/2026","2/6/2026","2/7/2026","CCC","Core Corp
CUSIP: 123456789
Dividend Reinvestment","Buy","0.2","$25.00","($5.00)"
"2/7/2026","2/7/2026","2/7/2026","","ACH Withdrawal","ACH","","","($200.00)"
`);

  const payload = buildSanitizedPortfolioPayload({
    asOfDate: "2026-02-08",
    baselineDate: "2026-02-02",
    failedTickers: [],
    generatedAt: "2026-02-08T00:00:00.000Z",
    historiesByTicker: new Map([
      ["AAA", history([["2026-02-02", 100], ["2026-02-05", 120], ["2026-02-06", 125], ["2026-02-08", 125]])],
      ["CCC", history([["2026-02-06", 25], ["2026-02-08", 26]])],
    ]),
    trades,
  });

  assert.equal(payload.status, "ready");
  assert.equal(payload.summary.holdingsCount, 2);
  assert.deepEqual(
    payload.holdings.map((holding) => holding.ticker),
    ["AAA", "CCC"]
  );
  assert.ok(payload.holdings.every((holding) => !("quantity" in holding)));
  assert.ok(payload.holdings.every((holding) => !("costBasis" in holding)));
  assert.equal(payload.performanceStatus, "unavailable");
  assert.equal(payload.summary.accountReturnPct, null);
  assert.deepEqual(payload.performance, []);
  assert.equal("maxDrawdownPct" in payload.summary, false);
});

test("broker history preserves real account returns even with no open positions", () => {
  const brokerReturns = parseBrokerReturnHistory("Date,ReturnPct\n2026-02-02,0\n2026-02-03,2.75\n");
  const payload = buildSanitizedPortfolioPayload({
    asOfDate: "2026-02-03", baselineDate: "2026-02-02", trades: [], historiesByTicker: new Map(),
    brokerReturns: brokerReturns.map((point) => ({ ...point, balance: 12345, cashFlow: 500 })),
  });
  assert.deepEqual(payload.performance, brokerReturns);
  assert.equal(payload.summary.accountReturnPct, 2.75);
  assert.equal(payload.performanceSource, "broker-return-history");
  assert.equal(payload.summary.unrealizedReturnPct, null);
  assert.ok(!JSON.stringify(payload).match(/balance|cashFlow|quantity|costBasis|marketValue|"price"/));
});

test("broker return parser rejects raw money columns, missing values, impossible and duplicate dates", () => {
  for (const csv of [
    "Date,Balance\n2026-02-02,1000\n2026-02-03,1100",
    "Date,ReturnPct,Amount\n2026-02-02,0,1000\n2026-02-03,1,1001",
    "Date,ReturnPct\n2026-02-02,\n2026-02-03,1",
    "Date,ReturnPct\n2026-02-30,0\n2026-03-03,1",
    "Date,ReturnPct\n2026-02-02,0\n2026-02-02,1",
  ]) assert.throws(() => parseBrokerReturnHistory(csv));
  assert.deepEqual(parseBrokerReturnHistory("Date,ReturnPct\n2026-02-03,-2.5\n2026-02-02,0"), [
    { date: "2026-02-02", returnPct: 0 }, { date: "2026-02-03", returnPct: -2.5 },
  ]);
});

test("share receipts and noncash transfers exclude the affected ticker from the snapshot", () => {
  const csv = `Activity Date,Instrument,Description,Trans Code,Quantity,Price,Amount
2/2/2026,AAA,Alpha,Buy,1,$100,($100)
2/3/2026,AAA,Alpha,ITRF,1S,,
2/3/2026,BBB,Beta,REC,1,,
2/4/2026,,Dividend,CDIV,,,$1
`;
  const coverage = inspectPortfolioActivityCoverage(csv);
  assert.equal(coverage.lastActivityDate, "2026-02-04");
  assert.deepEqual(coverage.excludedTickers.map((item) => item.ticker), ["AAA", "BBB"]);
  const payload = buildSanitizedPortfolioPayload({
    asOfDate: "2026-02-04", baselineDate: "2026-02-02", trades: parsePortfolioTradeRows(csv),
    historiesByTicker: new Map([["AAA", history([["2026-02-02", 100]])]]),
    excludedTickers: coverage.excludedTickers, transactionAsOfDate: coverage.lastActivityDate,
  });
  assert.equal(payload.status, "partial");
  assert.deepEqual(payload.holdings, []);
  assert.equal(payload.summary.accountReturnPct, null);
});

test("missing market closes are not converted to zero and old zero cache points are ignored", () => {
  const timestamps = [2, 3, 4, 5].map((day) => Date.UTC(2026, 1, day, 21) / 1000);
  const parsed = parseMarketHistoryResponse({ chart: { result: [{ timestamp: timestamps,
    indicators: { quote: [{ close: [100, null, 0, 105] }] },
  }] } });
  assert.deepEqual(parsed, history([["2026-02-02", 100], ["2026-02-05", 105]]));
  const lookups = buildPortfolioPriceLookups(new Map([["AAA", [...parsed, { date: "2026-02-04", close: 0 }]]]), "2026-02-02", "2026-02-05");
  assert.equal(lookups.get("AAA").byDate.get("2026-02-04"), 100);
});

test("routine generation preserves verified broker history and does not revive legacy proxy curves", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-history-test-"));
  try {
    const output = path.join(dir, "public.json");
    const input = "Activity Date,Instrument,Description,Trans Code,Quantity,Price,Amount\n2/3/2026,,Deposit,ACH,,,$100\n";
    const brokerPoints = [{ date: "2026-02-02", returnPct: 0 }, { date: "2026-02-03", returnPct: 2.75 }];
    const env = { ...process.env, PORTFOLIO_OUTPUT_JSON: output, PORTFOLIO_TRADES_CSV_TEXT: input,
      PORTFOLIO_RETURNS_CSV: "", PORTFOLIO_AS_OF_DATE: "2026-02-10" };
    await fs.writeFile(output, JSON.stringify({ schemaVersion: 2, transactionAsOfDate: "2026-02-03",
      performanceStatus: "ready", performanceSource: "broker-return-history", performance: brokerPoints }));
    execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], { env });
    let result = JSON.parse(await fs.readFile(output, "utf8"));
    assert.deepEqual(result.performance, brokerPoints);
    assert.equal(result.asOfDate, "2026-02-10");
    assert.equal(result.transactionAsOfDate, "2026-02-03");
    assert.equal(result.performanceSource, "broker-return-history");
    assert.equal(result.performance.at(-1).date, "2026-02-03", "Verified broker points must not be extended with an estimate");
    await fs.writeFile(output, JSON.stringify({ performance: brokerPoints, status: "ready" }));
    execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], { env });
    result = JSON.parse(await fs.readFile(output, "utf8"));
    assert.equal(result.performanceStatus, "ready");
    assert.equal(result.performanceSource, "reconstructed-activity");
    assert.ok(result.performance.every((point) => point.returnPct === 0), "Reconstruction must not reuse the legacy proxy values");
    assert.equal(result.performance.at(-1).date, "2026-02-10");
    const newer = { ...result, transactionAsOfDate: "2026-03-01" };
    await fs.writeFile(output, JSON.stringify(newer));
    execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], { env });
    assert.deepEqual(JSON.parse(await fs.readFile(output, "utf8")), newer);
    assert.throws(() => execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], {
      env: { ...env, PORTFOLIO_RETURNS_CSV: path.join(dir, "returns.csv") }, stdio: "pipe",
    }), /Return-history import requires an activity export/);
    assert.deepEqual(JSON.parse(await fs.readFile(output, "utf8")), newer);
    assert.throws(() => execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], {
      env: { ...env, PORTFOLIO_TRADES_CSV: "", PORTFOLIO_TRADES_CSV_TEXT: "", PORTFOLIO_TRADES_CSV_B64: "", PORTFOLIO_TRADES_CSV_BASE64: "" }, stdio: "pipe",
    }));
    assert.deepEqual(JSON.parse(await fs.readFile(output, "utf8")), newer);
  } finally {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("portfolio-history-test-"));
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("routine generation reprices unchanged reported holdings and cash through the valuation date", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-daily-valuation-test-"));
  try {
    const output = path.join(dir, "public.json");
    const cacheDir = path.join(dir, "market-cache");
    await fs.mkdir(cacheDir);
    await fs.writeFile(path.join(cacheDir, "AAA.json"), JSON.stringify({
      version: "raw-share-prices-v1", fetchedAt: Date.now() - 1000,
      startDate: "2026-01-26", endDate: "2026-02-10",
      history: history([["2026-02-02", 100], ["2026-02-03", 100], ["2026-02-06", 120], ["2026-02-09", 110]]),
    }));
    const input = "Activity Date,Instrument,Description,Trans Code,Quantity,Price,Amount\n" +
      "2/3/2026,,Interest,INT,,,$2\n" +
      "2/2/2026,AAA,Alpha,Buy,1,$100,($100)\n" +
      "2/2/2026,,Deposit,ACH,,,$200\n";
    const env = {
      ...process.env, PORTFOLIO_OUTPUT_JSON: output, PORTFOLIO_TRADES_CSV_TEXT: input,
      PORTFOLIO_RETURNS_CSV: "", PORTFOLIO_MARKET_DATA_CACHE_DIR: cacheDir,
      PORTFOLIO_MARKET_DATA_CACHE_TTL_HOURS: "12", PORTFOLIO_BASELINE_DATE: "2026-02-02",
    };
    const generate = async (asOfDate) => {
      execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], { env: { ...env, PORTFOLIO_AS_OF_DATE: asOfDate } });
      return JSON.parse(await fs.readFile(output, "utf8"));
    };
    const atReport = await generate("2026-02-03");
    assert.equal(atReport.summary.accountReturnPct, 1);
    assert.equal(atReport.holdings[0].currentReturnPct, 0);
    assert.doesNotMatch(atReport.performanceMessage, /valuations assume unchanged holdings and cash/);

    const weekend = await generate("2026-02-08");
    assert.equal(weekend.asOfDate, "2026-02-08");
    assert.equal(weekend.transactionAsOfDate, "2026-02-03");
    assert.equal(weekend.latestTradingDate, "2026-02-06");
    assert.equal(weekend.summary.accountReturnPct, 11);
    assert.equal(weekend.holdings[0].currentReturnPct, 20);
    assert.equal(weekend.summary.holdingsCount, 1);
    assert.deepEqual(weekend.performance.filter((point) => point.date >= "2026-02-06"), [
      { date: "2026-02-06", returnPct: 11 }, { date: "2026-02-07", returnPct: 11 }, { date: "2026-02-08", returnPct: 11 },
    ]);
    assert.match(weekend.performanceMessage, /After 2026-02-03, valuations assume unchanged holdings and cash; only market prices are updated\./);
    assert.deepEqual(weekend.failedTickers, []);

    const monday = await generate("2026-02-09");
    assert.equal(monday.asOfDate, "2026-02-09");
    assert.equal(monday.transactionAsOfDate, "2026-02-03");
    assert.equal(monday.latestTradingDate, "2026-02-09");
    assert.equal(monday.summary.accountReturnPct, 6);
    assert.equal(monday.holdings[0].currentReturnPct, 10);
    assert.deepEqual(monday.performance.filter((point) => point.date <= "2026-02-08"), weekend.performance);
    assert.equal(monday.performanceSource, "reconstructed-activity");
  } finally {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("portfolio-daily-valuation-test-"));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
