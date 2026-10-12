import { buildPortfolioPriceLookups, listCalendarDates, normalizeUsDate, parseCsv, parseSignedMoney } from "./portfolio-lib.mjs";

const CASH_CONTRIBUTIONS = new Set(["ACH", "RTP", "XENT_CC"]);
const CASH_INCOME_AND_FEES = new Set(["CDIV", "MDIV", "INT", "SLIP", "NRAT", "DTAX", "GOLD", "GMPC"]);
const SHARE_TOLERANCE = 1e-6;

// Private accounting inputs never leave this module. The public result contains
// dates and a single percentage scale, not balances, quantities or cash flows.
export function parseAccountActivity(csvText) {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
  const header = rows.shift()?.map((value) => value.trim()) ?? [];
  const indexes = Object.fromEntries(header.map((value, index) => [value, index]));
  for (const column of ["Activity Date", "Instrument", "Description", "Trans Code", "Quantity", "Amount"]) {
    if (!(column in indexes)) throw new Error(`Account activity is missing required column: ${column}`);
  }
  const cell = (row, column) => (row[indexes[column]] ?? "").trim();
  return rows
    .flatMap((row, sourceOrder) => {
      const dateText = cell(row, "Activity Date");
      if (!dateText) return [];
      const activityDate = normalizeUsDate(dateText);
      if (!activityDate) throw new Error("Account activity contains an invalid date.");
      const quantityText = cell(row, "Quantity").replace(/,/g, "");
      const shareText = quantityText.replace(/S$/, "");
      const quantity = quantityText ? Number(shareText) : null;
      if (quantityText && (!/^\d+(?:\.\d+)?$/.test(shareText) || !Number.isFinite(quantity) || quantity <= 0)) {
        throw new Error("Account activity contains an invalid share quantity.");
      }
      const transCode = cell(row, "Trans Code");
      const fractionalDigits = shareText.match(/\.(\d+)$/)?.[1].length ?? 0;
      const amountText = cell(row, "Amount");
      const amount = parseSignedMoney(amountText);
      if (amountText && !Number.isFinite(amount)) throw new Error("Account activity contains an invalid cash amount.");
      return [
        {
          activityDate,
          ticker: cell(row, "Instrument"),
          description: cell(row, "Description"),
          transCode,
          quantity,
          // Fractional receipts can be displayed less precisely than subsequent
          // executions. Keep the half-unit uncertainty private and source-bound.
          ...(transCode === "REC" ? { quantityUncertainty: fractionalDigits ? 0.5 * 10 ** -fractionalDigits : 0 } : {}),
          amount,
          sourceOrder,
        },
      ];
    })
    .sort((left, right) => left.activityDate.localeCompare(right.activityDate) || right.sourceOrder - left.sourceOrder);
}

export function reconstructAccountHistory({ activities, historiesByTicker, baselineDate, asOfDate }) {
  const recorded = activities.filter((row) => row.activityDate <= asOfDate);
  if (!recorded.length) throw new Error("No activity is available for account reconstruction.");
  const openingDate = recorded[0].activityDate;
  const lastActivityDate = recorded.at(-1).activityDate;
  const chartStart = [openingDate, baselineDate].sort().at(-1);
  const lookups = buildPortfolioPriceLookups(historiesByTicker, openingDate, asOfDate);
  const closeFor = (ticker, date) => {
    const lookup = lookups.get(ticker);
    const close = lookup?.byDate.get(date);
    // Forward fill weekends/holidays, but never invent a price or carry a stale
    // quote indefinitely across an unavailable/delisted security history.
    const lastQuote = lookup?.tradingDates.filter((day) => day <= date).at(-1);
    if (!Number.isFinite(close) || !lastQuote || (Date.parse(date) - Date.parse(lastQuote)) / 86400000 > 7) {
      throw new Error(`Account reconstruction needs a recent closing price for ${ticker} on ${date}.`);
    }
    return close;
  };
  const transferCashByDate = new Map();
  for (const row of recorded) {
    if (row.transCode === "ITRF" && !row.quantity && Number.isFinite(row.amount)) {
      transferCashByDate.set(row.activityDate, (transferCashByDate.get(row.activityDate) ?? 0) + row.amount);
    }
  }

  const quantities = new Map();
  const receiptUncertainty = new Map();
  let reconciledFractionalReceipt = false;
  let cash = 0;
  let netFunding = 0;
  let activityIndex = 0;
  const observations = [];
  for (const date of listCalendarDates(openingDate, asOfDate)) {
    for (const [ticker, history] of historiesByTicker) {
      const ratio = history.find((point) => point.date === date)?.splitRatio;
      if (ratio !== undefined) {
        if (!(Number.isFinite(ratio) && ratio > 0)) throw new Error("Market history contains an invalid split ratio.");
        quantities.set(ticker, (quantities.get(ticker) ?? 0) * ratio);
        receiptUncertainty.set(ticker, (receiptUncertainty.get(ticker) ?? 0) * ratio);
      }
    }
    while (activityIndex < recorded.length && recorded[activityIndex].activityDate === date) {
      const row = recorded[activityIndex++];
      const code = row.transCode;
      if (code === "Buy" || code === "Sell") {
        requireShares(row);
        requireCash(row);
        if ((code === "Buy" && row.amount >= 0) || (code === "Sell" && row.amount <= 0)) {
          throw new Error(`Account trade has an inconsistent cash direction for ${row.ticker}.`);
        }
        const reconciled = changeShares(quantities, receiptUncertainty, row.ticker, row.quantity * (code === "Buy" ? 1 : -1), code === "Sell");
        reconciledFractionalReceipt ||= reconciled;
        cash += row.amount; // Net proceeds preserve commissions and realized P&L.
      } else if (code === "REC" || (code === "ITRF" && row.quantity)) {
        requireShares(row);
        if (row.amount !== null && row.amount !== 0) throw new Error("A share transfer contains an ambiguous cash amount.");
        let direction = 1;
        if (code === "ITRF") {
          const pairedCash = transferCashByDate.get(date);
          if (!pairedCash) throw new Error("Share-transfer direction cannot be established from this report.");
          direction = Math.sign(pairedCash);
        }
        const transferredShares = direction * row.quantity;
        changeShares(quantities, receiptUncertainty, row.ticker, transferredShares);
        if (code === "REC") {
          const uncertainty = row.quantityUncertainty ?? 0;
          if (!Number.isFinite(uncertainty) || uncertainty < 0) throw new Error("A receipt contains invalid share precision.");
          receiptUncertainty.set(row.ticker, (receiptUncertainty.get(row.ticker) ?? 0) + uncertainty);
        }
        // Unlabelled REC is assumed an incoming external receipt. ITRF direction
        // is inferred from its same-date signed cash transfer, never the S unit.
        netFunding += transferredShares * closeFor(row.ticker, date);
      } else if (CASH_CONTRIBUTIONS.has(code) || code === "ITRF" || code === "MISC") {
        if (row.quantity) throw new Error("Unexpected shares in a cash contribution.");
        if (code === "MISC" && !/^Recurring deposit reward$/i.test(row.description)) {
          throw new Error("Unclassified miscellaneous activity needs reconciliation.");
        }
        requireCash(row);
        cash += row.amount;
        netFunding += row.amount;
      } else if (CASH_INCOME_AND_FEES.has(code)) {
        if (row.quantity) throw new Error("Unexpected shares in an income or fee record.");
        requireCash(row);
        cash += row.amount;
      } else {
        throw new Error(`Unsupported account activity code: ${code || "missing"}`);
      }
    }
    // Signed cash is retained: trade-date debits can represent unsettled or
    // financed payables. Clamping it to zero would fabricate account profit.
    let equity = cash;
    for (const [ticker, quantity] of quantities) if (quantity > SHARE_TOLERANCE) equity += quantity * closeFor(ticker, date);
    if (date >= chartStart) observations.push({ date, profit: equity - netFunding });
  }
  if (!(netFunding > 0)) throw new Error("Account reconstruction requires positive net funding at the report cutoff.");
  const performance = observations.map(({ date, profit }) => ({ date, returnPct: Math.round((profit / netFunding) * 1e8) / 1e6 }));
  return {
    performance,
    performanceSource: "reconstructed-activity",
    performanceMethod: "Net investment profit/loss as a percentage of net funding at the report cutoff (fixed scale).",
    performanceMessage:
      "Reconstructed daily at market close, assuming zero opening balances. Includes realized gains/losses, dividends, interest, taxes and fees; removes cash and security transfers. May differ from the broker's chart." +
      (reconciledFractionalReceipt ? " Fractional receipts were reconciled within the report's displayed precision." : "") +
      (asOfDate > lastActivityDate
        ? ` After ${lastActivityDate}, valuations assume unchanged holdings and cash; only market prices are updated.`
        : ""),
  };
}

function requireCash(row) {
  if (!Number.isFinite(row.amount)) throw new Error(`Account activity ${row.transCode} is missing its cash amount.`);
}
function requireShares(row) {
  if (!row.ticker || !(row.quantity > 0)) throw new Error(`Account activity ${row.transCode} is missing its security or shares.`);
}
function changeShares(quantities, receiptUncertainty, ticker, change, allowReceiptReconciliation = false) {
  const next = (quantities.get(ticker) ?? 0) + change;
  if (next < -SHARE_TOLERANCE) {
    const budget = receiptUncertainty.get(ticker) ?? 0;
    if (!allowReceiptReconciliation || !(budget > 0) || -next > budget + SHARE_TOLERANCE) {
      throw new Error(`Account activity for ${ticker} requires an opening position or an unrecorded share movement.`);
    }
    quantities.set(ticker, 0);
    receiptUncertainty.delete(ticker);
    return true;
  }
  quantities.set(ticker, Math.abs(next) <= SHARE_TOLERANCE ? 0 : next);
  // A closed position cannot donate an old receipt's precision to later trades.
  if (Math.abs(next) <= SHARE_TOLERANCE) receiptUncertainty.delete(ticker);
  return false;
}
