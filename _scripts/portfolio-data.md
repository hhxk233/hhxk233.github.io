# Portfolio data

The public payload contains dates, percentages, company names, tickers, and
methodology labels only. Keep brokerage exports outside the repository. Never
publish account identifiers, balances, cash flows, share quantities, prices,
cost basis, or raw transaction descriptions.

## Reconstructed account curve

Provide a complete private activity export through `PORTFOLIO_TRADES_CSV`,
`PORTFOLIO_TRADES_CSV_TEXT`, or gzip/plain Base64 `PORTFOLIO_TRADES_CSV_B64`.
Run `node _scripts/generate-portfolio-data.mjs`. The generator replays the full
report before cropping observations to `PORTFOLIO_BASELINE_DATE` (default
2026-02-02). After the report's last recorded activity, it holds shares and cash
constant and values those positions through `PORTFOLIO_AS_OF_DATE` (the current
date by default), including split adjustments. No later trades, deposits,
withdrawals, dividends, or fees are invented. A newer report is needed to include
those actual account events. The chart separately shows activity and price dates.

The account ledger uses trade dates and signed cash amounts. Purchases add shares
and reduce cash; sales remove shares and leave their net proceeds in cash.
Dividends, interest, stock-lending income, taxes, subscription fees, and fee refunds
remain in the ledger. Reinvestment is an ordinary purchase, so dividends are not
counted twice. Negative cash is retained as a possible unsettled/financed payable;
it is never clamped to zero or filled by an invented deposit.

The reconstruction assumes zero opening cash and shares. Incoming `REC` shares
are treated as external contributions at the receipt day's closing price. `ITRF`
shares use the sign of a matching same-date cash transfer to infer direction;
the `S` suffix is a share unit, not a direction. ACH, instant bank transfers,
cash/security account transfers, credit-card cashback, and recurring-deposit
rewards are external contributions. Gold-plan credits are internal fee refunds.
The report's outgoing BOXX interpretation reconciles to zero after its
later sale. Unclassified activities, missing prices, and share underflows fail
generation and preserve the existing public snapshot.

Fractional `REC` receipts can have fewer decimal places than later sale records.
The ledger tracks half of each receipt's last reported fractional share unit as
a rounding bound, scales that bound through splits, and consumes it when a sale
closes a position with a shortfall inside that bound. Larger shortfalls still
fail. Recorded transfer values remain estimates at the report's precision; sale
cash proceeds are never changed or discarded.

Daily equity is signed cash plus every security's shares times its closing price.
Net investment profit/loss is equity minus cumulative external contributions.
Every public point divides that profit/loss by the same positive net funding at
the report cutoff, then multiplies by 100. This fixed scale preserves the
dollar-P&L curve's shape while hiding absolute amounts. It is not a time-weighted
return, an IRR, or an exact recreation of Robinhood's return percentage. Date-range
controls crop this series without changing its normalization or inventing
intraday observations.

Yahoo's historical closes are split adjusted. The loader reverses later split
adjustments to recover prices per share as traded on each date, then the ledger
adjusts held quantities on each split's effective date. Quotes are retrieved
through the current date so a split after the report cutoff can also be reversed.
Versioned market caches reject incompatible date ranges and old adjusted prices.

The chart is explicitly labeled reconstructed. Opening balances, unlabelled share
receipts, and transfer direction remain assumptions, and daily closing-price
observations can differ from a broker's intraday chart. The broker excludes
external transfers from its return calculation; see
[Robinhood's chart methodology](https://robinhood.com/us/en/support/articles/using-charts/).

## Optional broker return history

A private `PORTFOLIO_RETURNS_CSV` with exactly `Date,ReturnPct` columns can override
the reconstruction with broker-reported cumulative percentages on one consistent
baseline. Dates must use `YYYY-MM-DD`, and 2.75 means 2.75%. Additional columns,
missing values, invalid dates, and duplicates are rejected. Only `date` and
`returnPct` are copied publicly. Routine refreshes preserve existing schema 2
broker history; legacy open-position proxy curves are never revived.

## Holdings snapshot and refreshes

Holdings use a separate FIFO calculation. Non-trade share movements exclude the
affected security from that view until its cost basis is reconciled. The account
curve includes those securities using the transfer assumptions above. Holdings
weights are normalized among the securities shown and exclude cash; their returns
are unrealized, not account performance.

An older private export cannot replace a newer schema 2 snapshot. Parse/accounting
failures preserve the last reviewed output. The scheduled refresh runs daily at
23:20 UTC using the encrypted `PORTFOLIO_TRADES_CSV_B64` repository secret.
That secret must match the latest reviewed report for daily valuation to proceed;
an older secret is safely skipped. Updating it with a newer complete export
refreshes the recorded positions and cash flows. The workflow verifies accounting
tests, generates percentage-only public data, and deploys changed output.
Private reports and market caches must remain outside committed output.
