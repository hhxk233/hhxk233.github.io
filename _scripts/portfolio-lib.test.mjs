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
    assert.equal(result.asOfDate, "2026-02-03");
    await fs.writeFile(output, JSON.stringify({ performance: brokerPoints, status: "ready" }));
    execFileSync(process.execPath, ["_scripts/generate-portfolio-data.mjs"], { env });
    result = JSON.parse(await fs.readFile(output, "utf8"));
    assert.equal(result.performanceStatus, "unavailable");
    assert.deepEqual(result.performance, []);
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
