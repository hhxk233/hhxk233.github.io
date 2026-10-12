import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadMarketHistoriesForTickers, parseMarketHistoryResponse } from "./portfolio-lib.mjs";

const epoch = (date) => Date.parse(`${date}T13:30:00Z`) / 1000;

function marketPayload(points, splits = []) {
  return {
    chart: {
      result: [
        {
          timestamp: points.map(([date]) => epoch(date)),
          indicators: { quote: [{ close: points.map(([, close]) => close) }] },
          events: {
            splits: Object.fromEntries(
              splits.map(([date, numerator, denominator]) => [
                epoch(date),
                {
                  date: epoch(date),
                  numerator,
                  denominator,
                },
              ])
            ),
          },
        },
      ],
    },
  };
}

test("reverse split restores old share prices and marks the event day", () => {
  const result = parseMarketHistoryResponse(
    marketPayload(
      [
        ["2026-03-10", 150],
        ["2026-04-08", 120],
        ["2026-07-24", 100],
      ],
      [["2026-07-24", 1, 150]]
    )
  );
  assert.deepEqual(result, [
    { date: "2026-03-10", close: 1 },
    { date: "2026-04-08", close: 0.8 },
    { date: "2026-07-24", close: 100, splitRatio: 1 / 150 },
  ]);
});

test("multiple later splits are undone without adjusting the split day's price for itself", () => {
  const result = parseMarketHistoryResponse(
    marketPayload(
      [
        ["2026-02-02", 40],
        ["2026-02-03", 50],
        ["2026-02-04", 60],
      ],
      [
        ["2026-02-03", 2, 1],
        ["2026-02-04", 1, 5],
      ]
    )
  );
  assert.deepEqual(result, [
    { date: "2026-02-02", close: 16 },
    { date: "2026-02-03", close: 10, splitRatio: 2 },
    { date: "2026-02-04", close: 60, splitRatio: 0.2 },
  ]);
});

test("a returned split beyond the last quote still corrects pre-event historical prices", () => {
  const result = parseMarketHistoryResponse(
    marketPayload(
      [
        ["2026-02-02", 40],
        ["2026-02-03", 50],
      ],
      [["2026-07-24", 1, 10]]
    )
  );
  assert.deepEqual(result, [
    { date: "2026-02-02", close: 4 },
    { date: "2026-02-03", close: 5 },
  ]);
});

test("invalid stock-split ratios and missing in-range event quotes fail safely", () => {
  for (const [numerator, denominator] of [
    [1, 0],
    [0, 10],
    [-1, 10],
    [1, null],
    [1, "bad"],
    [Infinity, 10],
  ]) {
    assert.throws(
      () => parseMarketHistoryResponse(marketPayload([["2026-02-02", 40]], [["2026-02-03", numerator, denominator]])),
      /invalid stock split/
    );
  }
  assert.throws(
    () =>
      parseMarketHistoryResponse(
        marketPayload(
          [
            ["2026-02-02", 40],
            ["2026-02-03", null],
            ["2026-02-04", 40],
          ],
          [["2026-02-03", 2, 1]]
        )
      ),
    /missing its historical market price/
  );
});

test("no-split history filters null prices without inventing zero-price crashes", () => {
  const result = parseMarketHistoryResponse(
    marketPayload([
      ["2026-02-02", 100],
      ["2026-02-03", null],
      ["2026-02-04", 0],
      ["2026-02-05", 105],
    ])
  );
  assert.deepEqual(result, [
    { date: "2026-02-02", close: 100 },
    { date: "2026-02-05", close: 105 },
  ]);
});

test("market cache rejects legacy prices and insufficient date bounds, reuses compatible history", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-market-cache-test-"));
  const priorFetch = globalThis.fetch;
  let requests = 0;
  try {
    const cachePath = path.join(dir, "TEST.json");
    await fs.writeFile(cachePath, JSON.stringify({ fetchedAt: Date.now(), history: [{ date: "2026-02-02", close: 999 }] }));
    globalThis.fetch = async (_url, options) => {
      requests += 1;
      assert.ok(options.signal instanceof AbortSignal);
      return {
        ok: true,
        json: async () =>
          marketPayload(
            [
              ["2026-02-02", 40],
              ["2026-02-03", 50],
            ],
            [["2026-02-03", 2, 1]]
          ),
      };
    };
    const options = { cacheDir: dir, cacheTtlMs: 60000, startDate: "2026-02-02", endDate: "2026-02-03" };
    let loaded = await loadMarketHistoriesForTickers(["TEST"], options);
    assert.equal(requests, 1);
    assert.equal(loaded.historiesByTicker.get("TEST")[0].close, 80);
    const saved = JSON.parse(await fs.readFile(cachePath, "utf8"));
    assert.equal(saved.version, "raw-share-prices-v1");
    assert.equal(saved.startDate, options.startDate);
    assert.equal(saved.endDate, options.endDate);
    loaded = await loadMarketHistoriesForTickers(["TEST"], options);
    assert.equal(requests, 1);
    assert.equal(loaded.failedTickers.length, 0);
    await loadMarketHistoriesForTickers(["TEST"], { ...options, endDate: "2026-02-04" });
    assert.equal(requests, 2);
    await loadMarketHistoriesForTickers(["TEST"], { ...options, startDate: "2026-02-01", endDate: "2026-02-04" });
    assert.equal(requests, 3);
    globalThis.fetch = async () => ({ ok: true, json: async () => marketPayload([["2026-02-02", 40]], [["2026-02-03", 1, 0]]) });
    loaded = await loadMarketHistoriesForTickers(["INVALID"], options);
    assert.equal(loaded.historiesByTicker.size, 0);
    assert.deepEqual(loaded.failedTickers, [{ ticker: "INVALID", reason: "Historical market data was unavailable." }]);
  } finally {
    globalThis.fetch = priorFetch;
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("portfolio-market-cache-test-"));
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("market fetches use at most four workers and return symbols in deterministic order", async () => {
  const priorFetch = globalThis.fetch;
  let active = 0;
  let peak = 0;
  try {
    globalThis.fetch = async (url) => {
      const ticker = new URL(url).pathname.split("/").at(-1);
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, ticker === "AAA" ? 15 : 1));
      active -= 1;
      if (ticker === "BBB" || ticker === "EEE") throw new Error("Synthetic fetch failure");
      return { ok: true, json: async () => marketPayload([["2026-02-02", 40]]) };
    };
    const loaded = await loadMarketHistoriesForTickers(["FFF", "EEE", "AAA", "DDD", "BBB", "CCC", "AAA"], {
      startDate: "2026-02-02",
      endDate: "2026-02-03",
    });
    assert.equal(peak, 4);
    assert.deepEqual([...loaded.historiesByTicker.keys()], ["AAA", "CCC", "DDD", "FFF"]);
    assert.deepEqual(
      loaded.failedTickers.map((item) => item.ticker),
      ["BBB", "EEE"]
    );
  } finally {
    globalThis.fetch = priorFetch;
  }
});
