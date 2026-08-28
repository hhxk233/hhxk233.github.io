import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";

import {
  applyTradeToOpenPositions,
  buildOpenPositionsByTicker,
  buildPortfolioPerformanceSeries,
  buildPortfolioPriceLookups,
  buildSanitizedPortfolioPayload,
  decodePortfolioCsvBase64,
  parsePortfolioTradeRows,
} from "./portfolio-lib.mjs";

function history(points) {
  return points.map(([date, close]) => ({ date, close }));
}

function round6(value) {
  return Number(value.toFixed(6));
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

test("transaction-aware performance does not give late buys return before purchase date", () => {
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
      amount: -50,
      displayName: "Beta Co",
      quantity: 1,
      sourceOrder: 1,
      ticker: "BBB",
      transCode: "Buy",
    },
  ];

  const priceLookups = buildPortfolioPriceLookups(
    new Map([
      ["AAA", history([["2026-02-02", 100], ["2026-02-03", 110], ["2026-02-04", 120], ["2026-02-05", 110]])],
      ["BBB", history([["2026-02-05", 50], ["2026-02-06", 55]])],
    ]),
    "2026-02-02",
    "2026-02-06"
  );

  const performance = buildPortfolioPerformanceSeries(trades, priceLookups, "2026-02-02", "2026-02-06");
  const byDate = Object.fromEntries(performance.map((point) => [point.date, point.returnFraction]));

  assert.equal(round6(byDate["2026-02-02"]), 0);
  assert.equal(round6(byDate["2026-02-03"]), 0.1);
  assert.equal(round6(byDate["2026-02-04"]), 0.2);
  assert.equal(round6(byDate["2026-02-05"]), round6(160 / 150 - 1));
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
});
