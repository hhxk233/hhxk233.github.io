# Portfolio data

The public payload contains dates, percentages, company names, and tickers only.
Keep brokerage exports outside this repository. Do not commit activity exports,
account identifiers, balances, share quantities, prices, cost basis, or cash flows.

## Account curve

An activity CSV cannot supply the broker's account return history. The old curve
was an open-position unrealized return divided by remaining FIFO cost basis. A
sale removed the sold lot's profit or loss, so it was not an account return and
cannot be reused as one.

To add a faithful curve, prepare an owner-only CSV from the same account's
broker-reported cumulative return history, with exactly these columns:

```csv
Date,ReturnPct
2026-02-02,0
2026-02-03,0.12
```

These are illustrative values, not portfolio data. `Date` uses `YYYY-MM-DD`;
`ReturnPct` is a numeric percentage (2.75 means 2.75%, not 0.0275). All points
must share one broker return baseline. Do not supply daily returns, raw account
values, open-position returns, or values digitized from a screenshot. Duplicate
dates, missing values, and additional columns are rejected.

Set `PORTFOLIO_RETURNS_CSV` to that private local file and provide the normal
`PORTFOLIO_TRADES_CSV` activity input, then run
`node _scripts/generate-portfolio-data.mjs`. Only the two percentage-history
fields are copied to the public payload. Chart range controls crop the visible
dates without inventing new period-return calculations.

Broker daily account values plus dated external flows and a verified opening
state could support a separate estimated return calculation, but this generator
does not assume those inputs or approximate the broker's method.

## Holdings snapshot and refreshes

The activity file supplies a limited holdings snapshot, not live account state.
Market valuation is capped to the last dated activity in the export; the public
payload records both activity cutoff and actual quote date. Share receipts,
noncash transfers, and other unhandled share movements exclude the affected
symbol until reconciled. Weights are renormalized within the included securities
and exclude cash. Returns in this section are explicitly unrealized FIFO returns.

The daily workflow's existing private activity secret remains unchanged. A
refresh preserves imported broker history only when the existing public payload
has schema version 2 and source `broker-return-history`. Version 1 curves never
qualify. An older activity export cannot overwrite a newer version 2 snapshot;
parse failures also preserve the existing file. To refresh the holdings beyond
the current cutoff, a newer complete activity export must be supplied separately.
An explicit return-history import paired with an older activity export fails
with a clear message and preserves the existing snapshot.
