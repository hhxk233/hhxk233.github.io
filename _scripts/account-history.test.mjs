import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountActivity, reconstructAccountHistory } from "./account-history.mjs";

// All amounts, securities, and descriptions in this file are synthetic fixtures.
const START = "2026-01-02";
const D1 = "2026-01-05";
const D2 = "2026-01-06";
const D3 = "2026-01-07";
const END = "2026-01-08";
const HEADER = ["Activity Date", "Process Date", "Settle Date", "Instrument", "Description", "Trans Code", "Quantity", "Price", "Amount"];

function activity(date, code, amount, { ticker = "", quantity = "", price = "", description = "Synthetic activity" } = {}) {
  return { date, code, amount, ticker, quantity, price, description };
}

function cash(value) {
  if (value === "" || value === null || value === undefined) return "";
  const absolute = `$${Math.abs(value).toFixed(4)}`;
  return value < 0 ? `(${absolute})` : absolute;
}

function csv(rows) {
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const usDate = (date) => {
    const [year, month, day] = date.split("-").map(Number);
    return `${month}/${day}/${year}`;
  };
  // Brokerage exports normally put the newest row first, including same-day rows.
  const body = [...rows].reverse().map((row) => {
    const date = usDate(row.date);
    return [date, date, date, row.ticker, row.description, row.code, row.quantity, cash(row.price), cash(row.amount)].map(quote).join(",");
  });
  return [HEADER.map(quote).join(","), ...body].join("\n");
}

function history(points) {
  return points.map(([date, close]) => ({ date, close }));
}

function reconstruct(rows, points = [], { baselineDate = START, asOfDate = END, ticker = "AAA" } = {}) {
  return reconstructAccountHistory({
    activities: parseAccountActivity(csv(rows)),
    historiesByTicker: new Map(points.length ? [[ticker, history(points)]] : []),
    baselineDate,
    asOfDate,
  });
}

function at(result, date) {
  assert.ok(Array.isArray(result.performance), "The result must expose a performance array");
  const point = result.performance.find((item) => item.date === date);
  assert.ok(point, `Expected a performance point for ${date}`);
  return point.returnPct;
}

function approximately(actual, expected) {
  assert.ok(Number.isFinite(actual), "The percentage must be finite");
  assert.ok(Math.abs(actual - expected) <= 1e-6, `Expected percentage ${expected}; received ${actual}`);
}

const openingBuy = () => [activity(START, "ACH", 100), activity(START, "Buy", -100, { ticker: "AAA", quantity: 1, price: 100 })];

test("realized profit and loss survive a complete sale and subsequent cash-only days", async (t) => {
  for (const [proceeds, expectedPct] of [
    [125, 25],
    [70, -30],
  ]) {
    await t.test(expectedPct > 0 ? "profitable full sale" : "loss-making full sale", () => {
      const result = reconstruct(
        [...openingBuy(), activity(D2, "Sell", proceeds, { ticker: "AAA", quantity: 1, price: 999 })],
        [
          [START, 100],
          [D1, 110],
          [D2, 115],
        ]
      );
      approximately(at(result, D1), 10);
      // Signed settlement amount governs the ledger, not Quantity * Price.
      approximately(at(result, D2), expectedPct);
      approximately(at(result, END), expectedPct);
    });
  }
});

test("cash-only accounts retain internal income without needing a security history", () => {
  const result = reconstruct([activity(START, "ACH", 100), activity(D1, "INT", 5), activity(D2, "GOLD", -1)]);
  approximately(at(result, START), 0);
  approximately(at(result, D1), 5);
  approximately(at(result, END), 4);
});

test("deposits and withdrawals do not move P&L and all points share the final funding scale", () => {
  const result = reconstruct(
    [...openingBuy(), activity(D2, "ACH", 120), activity(D3, "RTP", -20)],
    [
      [START, 100],
      [D1, 110],
      [D2, 110],
      [D3, 110],
      [END, 120],
    ]
  );
  // Final net external funding is 200 throughout this published series.
  approximately(at(result, D1), 5);
  approximately(at(result, D2), 5);
  approximately(at(result, D3), 5);
  approximately(at(result, END), 10);
});

test("dividends, withholding, and reinvestment are not counted twice", () => {
  const result = reconstruct(
    [
      ...openingBuy(),
      activity(D1, "CDIV", 10, { ticker: "AAA" }),
      activity(D1, "DTAX", -2, { ticker: "AAA" }),
      activity(D1, "Buy", -8, { ticker: "AAA", quantity: 0.08, price: 100, description: "Synthetic company\nDividend Reinvestment" }),
    ],
    [
      [START, 100],
      [D1, 100],
      [END, 105],
    ]
  );
  approximately(at(result, D1), 8);
  approximately(at(result, END), 13.4);
});

test("documented income, tax, and fee codes change internal P&L rather than funding", async (t) => {
  for (const [code, amount] of [
    ["CDIV", 2],
    ["MDIV", 2],
    ["INT", 2],
    ["SLIP", 2],
    ["NRAT", -2],
    ["DTAX", -2],
    ["GOLD", -2],
    ["GMPC", 2],
  ]) {
    await t.test(code, () => {
      const result = reconstruct([activity(START, "ACH", 100), activity(D1, code, amount)]);
      approximately(at(result, END), amount);
    });
  }
});

test("recurring deposit rewards and supported external cash codes are funding", () => {
  const result = reconstruct([
    activity(START, "ACH", 100),
    activity(D1, "RTP", 20),
    activity(D1, "XENT_CC", 5),
    activity(D2, "MISC", 5, { description: "Recurring deposit reward" }),
    activity(D3, "INT", 13),
  ]);
  approximately(at(result, D2), 0);
  approximately(at(result, END), 10);
});

test("negative cash stays a payable instead of being clamped to zero", () => {
  const result = reconstruct(
    [activity(START, "ACH", 100), activity(START, "Buy", -200, { ticker: "AAA", quantity: 2, price: 100 })],
    [
      [START, 100],
      [END, 90],
    ]
  );
  approximately(at(result, START), 0);
  approximately(at(result, END), -20);
});

test("a reverse split preserves account value and adjusts shares before same-day sales", async (t) => {
  for (const [saleDate, proceeds, expectedPct] of [
    [D1, 150, 0],
    [D2, 165, 10],
  ]) {
    await t.test(saleDate === D1 ? "sale on the effective split date" : "sale after a later price rise", () => {
      const result = reconstructAccountHistory({
        activities: parseAccountActivity(
          csv([
            activity(START, "ACH", 150),
            activity(START, "Buy", -150, { ticker: "AAA", quantity: 150, price: 1 }),
            activity(saleDate, "Sell", proceeds, { ticker: "AAA", quantity: 1, price: proceeds }),
          ])
        ),
        historiesByTicker: new Map([
          [
            "AAA",
            [
              { date: START, close: 1 },
              { date: D1, close: 150, splitRatio: 1 / 150 },
              { date: D2, close: 165 },
            ],
          ],
        ]),
        baselineDate: START,
        asOfDate: END,
      });
      approximately(at(result, START), 0);
      approximately(at(result, D1), 0);
      approximately(at(result, D2), expectedPct);
      approximately(at(result, END), expectedPct);
    });
  }
});

test("received shares and internal transfers use closing-value external funding", () => {
  const result = reconstruct(
    [
      activity(START, "ACH", 100),
      activity(START, "REC", "", { ticker: "AAA", quantity: 2 }),
      activity(D2, "ITRF", 30),
      activity(D2, "ITRF", "", { ticker: "AAA", quantity: 1 }),
      activity(D3, "ITRF", -30),
      activity(D3, "ITRF", "", { ticker: "AAA", quantity: 1 }),
    ],
    [
      [START, 50],
      [D1, 60],
      [D2, 60],
      [D3, 60],
      [END, 70],
    ]
  );
  approximately(at(result, START), 0);
  approximately(at(result, D1), 10);
  approximately(at(result, D2), 10);
  approximately(at(result, D3), 10);
  approximately(at(result, END), 20);
});

test("receipt precision is derived only from the displayed fractional quantity", () => {
  const parsed = parseAccountActivity(
    csv([
      activity(START, "REC", "", { ticker: "AAA", quantity: "1.2300S" }),
      activity(D1, "REC", "", { ticker: "BBB", quantity: "2" }),
      activity(D2, "REC", "", { ticker: "CCC", quantity: "0.123456" }),
      activity(D3, "Buy", -100, { ticker: "AAA", quantity: "1.0000" }),
    ])
  );
  assert.ok(Math.abs(parsed[0].quantityUncertainty / 0.00005 - 1) <= 1e-12);
  assert.equal(parsed[1].quantityUncertainty, 0);
  assert.ok(Math.abs(parsed[2].quantityUncertainty / 0.0000005 - 1) <= 1e-12);
  assert.equal(Object.hasOwn(parsed[3], "quantityUncertainty"), false);
  assert.throws(() => parseAccountActivity(csv([activity(START, "REC", "", { ticker: "AAA", quantity: "1e-4" })])));
});

const roundedReceipt = () => [activity(START, "ACH", 100), activity(START, "REC", "", { ticker: "AAA", quantity: "1.0000" })];
const flatReceiptPrices = () => [
  [START, 100],
  [D1, 100],
  [D2, 100],
  [D3, 100],
  [END, 100],
];

test("a sale closeout inside a receipt's precision preserves every cash proceed", () => {
  const result = reconstruct([...roundedReceipt(), activity(D1, "Sell", 101, { ticker: "AAA", quantity: "1.00004" })], flatReceiptPrices());
  approximately(at(result, START), 0);
  approximately(at(result, END), 0.5);
  assert.match(result.performanceMessage, /Fractional receipts were reconciled within the report's displayed precision/);
  assert.equal(JSON.stringify(result).includes("quantityUncertainty"), false);
  assert.equal(JSON.stringify(result).includes("receiptUncertainty"), false);
});

test("receipt precision cannot hide a larger missing position or an outgoing transfer", async (t) => {
  await t.test("sale outside the reported rounding bound", () => {
    assert.throws(() => reconstruct([...roundedReceipt(), activity(D1, "Sell", 101, { ticker: "AAA", quantity: "1.00006" })], flatReceiptPrices()));
  });
  await t.test("a buy creates no receipt budget", () => {
    assert.throws(() => reconstruct([...openingBuy(), activity(D1, "Sell", 101, { ticker: "AAA", quantity: "1.00004" })], flatReceiptPrices()));
  });
  await t.test("an integer receipt creates no rounding budget", () => {
    assert.throws(() =>
      reconstruct(
        [
          activity(START, "ACH", 100),
          activity(START, "REC", "", { ticker: "AAA", quantity: "1" }),
          activity(D1, "Sell", 101, { ticker: "AAA", quantity: "1.00004" }),
        ],
        flatReceiptPrices()
      )
    );
  });
  await t.test("transfer underflow cannot spend receipt precision", () => {
    assert.throws(() =>
      reconstruct(
        [...roundedReceipt(), activity(D1, "ITRF", -1), activity(D1, "ITRF", "", { ticker: "AAA", quantity: "1.00004" })],
        flatReceiptPrices()
      )
    );
  });
});

test("a split rescales the receipt precision together with its shares", () => {
  const result = reconstructAccountHistory({
    activities: parseAccountActivity(csv([...roundedReceipt(), activity(D1, "Sell", 101, { ticker: "AAA", quantity: "2.00009" })])),
    historiesByTicker: new Map([
      [
        "AAA",
        [
          { date: START, close: 100 },
          { date: D1, close: 50, splitRatio: 2 },
        ],
      ],
    ]),
    baselineDate: START,
    asOfDate: END,
  });
  approximately(at(result, END), 0.5);
  assert.match(result.performanceMessage, /Fractional receipts were reconciled/);
});

test("partial sales cannot reuse receipt precision after the position closes", async (t) => {
  for (const closeQuantity of ["0.50004", "0.50000"]) {
    await t.test(closeQuantity === "0.50004" ? "reconciled closeout consumes its budget" : "exact closeout clears its budget", () => {
      const beforeReopening = [
        ...roundedReceipt(),
        activity(D1, "Sell", 50, { ticker: "AAA", quantity: "0.50000" }),
        activity(D2, "Sell", 50, { ticker: "AAA", quantity: closeQuantity }),
      ];
      assert.doesNotThrow(() => reconstruct(beforeReopening, flatReceiptPrices()));
      assert.throws(() =>
        reconstruct(
          [
            ...beforeReopening,
            activity(D3, "Buy", -100, { ticker: "AAA", quantity: "1.00000" }),
            activity(END, "Sell", 100, { ticker: "AAA", quantity: "1.00004" }),
          ],
          flatReceiptPrices()
        )
      );
    });
  }
});

test("a share transfer without same-day cash direction fails reconciliation", () => {
  assert.throws(() =>
    reconstruct(
      [...openingBuy(), activity(D1, "ITRF", "", { ticker: "AAA", quantity: 1 })],
      [
        [START, 100],
        [D1, 100],
        [END, 100],
      ]
    )
  );
});

test("unrecognized activity and non-reward MISC rows fail instead of disappearing", async (t) => {
  for (const entry of [activity(D1, "UNRECOGNIZED", 5), activity(D1, "MISC", 5, { description: "Unexplained adjustment" })]) {
    await t.test(entry.code, () => {
      assert.throws(() => reconstruct([activity(START, "ACH", 100), entry]));
    });
  }
});

test("selling or transferring shares absent from the ledger fails", async (t) => {
  await t.test("unrecorded opening position", () => {
    assert.throws(() =>
      reconstruct(
        [activity(START, "ACH", 100), activity(D1, "Sell", 50, { ticker: "AAA", quantity: 1, price: 50 })],
        [
          [START, 50],
          [D1, 50],
          [END, 50],
        ]
      )
    );
  });
  await t.test("outgoing transfer exceeds shares held", () => {
    assert.throws(() =>
      reconstruct(
        [...openingBuy(), activity(D1, "ITRF", -1), activity(D1, "ITRF", "", { ticker: "AAA", quantity: 2 })],
        [
          [START, 100],
          [D1, 100],
          [END, 100],
        ]
      )
    );
  });
});

test("missing or invalid valuation prices cannot silently remove a position", async (t) => {
  const cases = [
    ["no history", []],
    [
      "only future history",
      [
        [D1, 100],
        [END, 100],
      ],
    ],
    [
      "null close",
      [
        [START, null],
        [END, 100],
      ],
    ],
    [
      "zero close",
      [
        [START, 0],
        [END, 100],
      ],
    ],
  ];
  for (const [label, points] of cases) {
    await t.test(label, () => {
      assert.throws(() => reconstruct(openingBuy(), points));
    });
  }
});

test("as-of cutoff excludes future activity and prices from both numerator and denominator", () => {
  const points = [
    [START, 100],
    [D1, 120],
    [D2, 999],
  ];
  const before = reconstruct(openingBuy(), points, { asOfDate: D1 });
  const withFuture = reconstruct(
    [...openingBuy(), activity(D2, "ACH", 900), activity(D2, "Sell", 999, { ticker: "AAA", quantity: 1, price: 999 })],
    points,
    { asOfDate: D1 }
  );
  assert.deepEqual(withFuture.performance, before.performance);
  approximately(at(withFuture, D1), 20);
  assert.ok(withFuture.performance.every((point) => point.date <= D1));
});

test("post-report daily valuation holds reported cash and holdings constant and discloses the assumption", () => {
  const rows = [...openingBuy(), activity(D1, "INT", 5)];
  const points = [[START, 100], [D1, 100], [D2, 120]];
  const atReport = reconstruct(rows, points, { asOfDate: D1 });
  approximately(at(atReport, D1), 5);
  assert.doesNotMatch(atReport.performanceMessage, /valuations assume unchanged holdings and cash/);

  const extended = reconstruct(rows, points);
  approximately(at(extended, D2), 25);
  approximately(at(extended, END), 25);
  assert.equal(extended.performance.at(-1).date, END);
  assert.match(extended.performanceMessage, /After 2026-01-05, valuations assume unchanged holdings and cash; only market prices are updated\./);
  // Interest is recorded once; extending the calendar does not invent accruals.
  assert.ok(extended.performance.filter((point) => point.date >= D2).every((point) => point.returnPct === 25));
});

test("a later display baseline preserves earlier cash, shares, and accumulated P&L", () => {
  const result = reconstruct(
    openingBuy(),
    [
      [START, 100],
      [D1, 110],
      [END, 120],
    ],
    { baselineDate: D1 }
  );
  approximately(at(result, D1), 10);
  approximately(at(result, END), 20);
  assert.ok(result.performance.every((point) => point.date >= D1));
});

test("nonpositive final external funding is rejected rather than dividing by zero", async (t) => {
  for (const withdrawal of [-100, -110]) {
    await t.test(withdrawal === -100 ? "zero funding" : "negative funding", () => {
      assert.throws(() => reconstruct([activity(START, "ACH", 100), activity(D1, "ACH", withdrawal)]));
    });
  }
});

test("public reconstruction exposes percentages and dates, with no raw financial ledger", () => {
  const rows = [...openingBuy(), activity(D2, "Sell", 125, { ticker: "AAA", quantity: 1, price: 125 })];
  const points = [
    [START, 100],
    [D1, 110],
    [D2, 125],
  ];
  const result = reconstruct(rows, points);
  const scaled = reconstruct(
    rows.map((row) => ({
      ...row,
      amount: row.amount === "" ? "" : row.amount * 7,
      quantity: row.quantity === "" ? "" : row.quantity * 7,
    })),
    points
  );
  assert.deepEqual(scaled.performance, result.performance, "Changing absolute account size must not change the public line");
  assert.ok(result.performance.length > 0);
  for (const point of result.performance) {
    assert.deepEqual(Object.keys(point).sort(), ["date", "returnPct"]);
    assert.match(point.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(point.returnPct));
  }
  const forbidden =
    /^(?:cash|cashBalance|balance|equity|amount|quantity|quantityUncertainty|receiptUncertainty|price|close|marketValue|pnl|profitLoss|positions|netFunding|finalFunding|netExternalFunding)$/i;
  function inspect(value) {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.test(key), false, `Public output must not contain raw field ${key}`);
      inspect(child);
    }
  }
  inspect(result);
});
