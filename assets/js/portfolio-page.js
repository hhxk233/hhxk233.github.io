(() => {
  const RANGE_OPTIONS = ["1W", "1M", "3M", "YTD", "ALL"];
  const PERFORMANCE_DECIMALS = 2;
  const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  let performanceChart = null;
  let allocationChart = null;
  let themeObserver = null;

  window.addEventListener("load", () => {
    const app = document.getElementById("portfolio-overview-app");
    if (!app) {
      return;
    }

    initPortfolioOverview(app).catch(() => {
      renderErrorState(
        app,
        "The portfolio page could not be initialized.",
        "Refresh the page or regenerate the sanitized dataset if the problem persists."
      );
    });
  });

  async function initPortfolioOverview(app) {
    renderLoadingState(app);

    if (typeof window.Chart === "undefined") {
      renderErrorState(
        app,
        "Chart.js is unavailable on this page.",
        "The page loaded without the chart library, so the portfolio visualization cannot be rendered."
      );
      return;
    }

    const endpoint = app.dataset.endpoint;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      renderErrorState(
        app,
        "The sanitized portfolio dataset could not be loaded.",
        "The page route is available, but the local data file request failed."
      );
      return;
    }

    const payload = await response.json();
    renderPortfolioApp(app, payload);
  }

  function renderPortfolioApp(app, payload) {
    destroyCharts();

    if (payload.status === "error") {
      renderErrorState(app, "Portfolio data is unavailable.", payload.message || "The local portfolio generator reported an error.");
      return;
    }

    if (payload.schemaVersion !== 2) {
      renderErrorState(
        app,
        "Account return history is being updated.",
        "The previous holdings-only chart has been removed because it did not represent total account performance."
      );
      return;
    }

    const failedTickers = Array.isArray(payload.failedTickers) ? payload.failedTickers : [];
    const excludedTickers = Array.isArray(payload.excludedTickers) ? payload.excludedTickers : [];
    const hasHistory =
      payload.performanceStatus === "ready" && payload.performanceSource === "broker-return-history" && payload.performance?.length >= 2;
    const holdings = Array.isArray(payload.holdings) ? payload.holdings : [];
    const latestPoint = hasHistory ? payload.performance.at(-1) : null;
    const seriesStartDate = hasHistory ? payload.performance[0].date : null;
    const isPartial = failedTickers.length + excludedTickers.length > 0;

    app.innerHTML = `
      <div class="portfolio-shell">
        <section class="portfolio-panel">
          <div class="portfolio-panel-header">
            <div>
              <h2>Account return</h2>
              <p class="portfolio-chart-meta">Percentages only. Account balances remain private.</p>
            </div>
            ${
              hasHistory
                ? `<div class="portfolio-range-tabs" role="group" aria-label="Dates shown in account return chart">
              ${RANGE_OPTIONS.map(
                (range) => `
                <button type="button" class="portfolio-range-tab" data-range="${range}" aria-pressed="false">${range}</button>
              `
              ).join("")}
            </div>`
                : ""
            }
          </div>
          ${
            hasHistory
              ? `
            <div class="portfolio-chart-focus">
              <strong id="portfolio-selected-return">${formatPercent(latestPoint.returnPct, PERFORMANCE_DECIMALS)}</strong>
              <span id="portfolio-selected-date">${formatDate(latestPoint.date)}</span>
            </div>
            <div class="portfolio-chart-wrap">
              <canvas id="portfolio-performance-chart" class="portfolio-chart-canvas" aria-label="Broker account cumulative return in percent"></canvas>
            </div>
            <p class="portfolio-chart-meta">Broker-reported cumulative return; observations from ${formatDate(
              seriesStartDate
            )}. Range controls change the dates shown, keeping the same return baseline.</p>
          `
              : `
            <div class="portfolio-banner" role="status">
              <div aria-hidden="true">—</div>
              <div>
                <strong>Return history unavailable</strong>
                <p>The activity export does not include the broker's account return history. A complete account curve will appear when that history is available.</p>
              </div>
            </div>
          `
          }
        </section>
        <section class="portfolio-summary-grid">
          ${renderSummaryCard(
            "Account return",
            formatPercent(payload.summary.accountReturnPct, PERFORMANCE_DECIMALS),
            hasHistory ? `Broker history through ${formatDate(latestPoint.date)}` : "Awaiting account return history",
            classForSignedValue(payload.summary.accountReturnPct)
          )}
          ${renderSummaryCard(
            "Open holdings unrealized",
            formatPercent(payload.summary.unrealizedReturnPct, PERFORMANCE_DECIMALS),
            "Included positions vs remaining FIFO cost basis",
            classForSignedValue(payload.summary.unrealizedReturnPct)
          )}
          ${renderSummaryCard(
            "Holdings daily move",
            formatPercent(payload.summary.holdingsDayChangePct, PERFORMANCE_DECIMALS),
            `Prices through ${formatDate(payload.latestTradingDate)}`,
            classForSignedValue(payload.summary.holdingsDayChangePct)
          )}
          ${renderSummaryCard(
            "Holdings shown",
            `${holdings.length}`,
            isPartial ? "Partial security snapshot" : "Reconstructed from recorded trades",
            ""
          )}
        </section>
        <section class="portfolio-panel">
          <div class="portfolio-panel-header">
            <div>
              <h2>${isPartial ? "Partial holdings snapshot" : "Holdings snapshot"}</h2>
              <p>Activity through ${formatDate(payload.transactionAsOfDate)}; closing prices through ${formatDate(
                payload.latestTradingDate
              )}. Weights cover only the securities shown and exclude cash. Unrealized returns exclude realized trades, dividends, and fees.</p>
            </div>
          </div>
          ${
            holdings.length
              ? `<div class="portfolio-allocation-grid">
            <div class="portfolio-allocation-chart"><canvas id="portfolio-allocation-chart" aria-label="Allocation within included securities only"></canvas></div>
            <div class="portfolio-holdings-table-wrap">
              <table class="portfolio-holdings-table">
                <thead><tr><th>Holding</th><th>Weight within subset</th><th>Unrealized return</th></tr></thead>
                <tbody>${holdings.map((holding) => renderHoldingRow(holding)).join("")}</tbody>
              </table>
            </div>
          </div>`
              : `<p>No reconciled holdings are available for this snapshot.</p>`
          }
          ${
            excludedTickers.length
              ? `<p class="portfolio-empty-list">Excluded pending share-transfer reconciliation: ${excludedTickers
                  .map((item) => escapeHtml(item.ticker))
                  .join(", ")}.</p>`
              : ""
          }
          ${
            failedTickers.length
              ? `<p class="portfolio-empty-list">Market prices unavailable: ${failedTickers.map((item) => escapeHtml(item.ticker)).join(", ")}.</p>`
              : ""
          }
        </section>
      </div>
    `;
    const state = {
      activeRange: "ALL",
      payload,
    };

    bindRangeControls(app, state);
    renderCharts(app, state);
    observeThemeChanges(app, state);
  }

  function renderLoadingState(app) {
    app.innerHTML = `
      <div class="portfolio-shell">
        <section class="portfolio-state-card" aria-live="polite">
          <div class="portfolio-spinner" aria-hidden="true"></div>
          <h2>Preparing sanitized portfolio data</h2>
          <p>Loading the public percentage-only snapshot.</p>
        </section>
      </div>
    `;
  }

  function renderErrorState(app, title, message) {
    destroyCharts();
    app.innerHTML = `
      <div class="portfolio-shell">
        <section class="portfolio-state-card" aria-live="polite">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </section>
      </div>
    `;
  }

  function renderEmptyState(app, message) {
    destroyCharts();
    app.innerHTML = `
      <div class="portfolio-shell">
        <section class="portfolio-state-card" aria-live="polite">
          <h2>No Valid Holdings Found</h2>
          <p>${escapeHtml(message)}</p>
        </section>
      </div>
    `;
  }

  function renderSummaryCard(label, value, footnote, extraClass) {
    return `
      <article class="portfolio-summary-card">
        <span class="portfolio-summary-label">${escapeHtml(label)}</span>
        <span class="portfolio-summary-value ${extraClass}">${escapeHtml(value)}</span>
        <span class="portfolio-summary-footnote">${escapeHtml(footnote)}</span>
      </article>
    `;
  }

  function renderHoldingRow(holding) {
    const returnClass = classForSignedValue(holding.currentReturnPct);
    return `
      <tr>
        <td>
          <div class="portfolio-holding-name">
            <strong>${escapeHtml(holding.ticker)}</strong>
            <span>${escapeHtml(holding.name || holding.ticker)}</span>
          </div>
        </td>
        <td class="portfolio-weight-cell">
          <div class="portfolio-weight-bar">
            <div class="portfolio-weight-bar-track" aria-hidden="true">
              <div class="portfolio-weight-bar-fill" style="width: ${Math.min(holding.weightPct, 100)}%"></div>
            </div>
            <span>${escapeHtml(formatUnsignedPercent(holding.weightPct, 2))}</span>
          </div>
        </td>
        <td class="${returnClass}">${escapeHtml(formatPercent(holding.currentReturnPct, PERFORMANCE_DECIMALS))}</td>
      </tr>
    `;
  }

  function bindRangeControls(app, state) {
    const buttons = [...app.querySelectorAll("[data-range]")];
    for (const button of buttons) {
      button.addEventListener("click", () => {
        state.activeRange = button.dataset.range;
        renderPerformanceChart(app, state);
      });
    }
    updateRangeButtons(app, state.activeRange);
  }

  function renderCharts(app, state) {
    if (app.querySelector("#portfolio-performance-chart")) renderPerformanceChart(app, state);
    if (app.querySelector("#portfolio-allocation-chart")) renderAllocationChart(app, state.payload);
  }

  function renderPerformanceChart(app, state) {
    const theme = readThemeTokens();
    const selectedRange = filterPerformanceByRange(state.payload.performance, state.activeRange);
    const chartData = selectedRange;
    const latestPoint = chartData.at(-1);
    const yBounds = computeYBounds(chartData.map((point) => point.returnPct));
    const selectedReturn = app.querySelector("#portfolio-selected-return");
    const selectedDate = app.querySelector("#portfolio-selected-date");
    const canvas = app.querySelector("#portfolio-performance-chart");
    const context = canvas.getContext("2d");

    if (performanceChart) {
      performanceChart.destroy();
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 340);
    gradient.addColorStop(0, theme.areaTop);
    gradient.addColorStop(1, theme.areaBottom);

    performanceChart = new window.Chart(context, {
      type: "line",
      data: {
        labels: chartData.map((point) => point.date),
        datasets: [
          {
            label: "Cumulative account return",
            data: chartData.map((point) => point.returnPct),
            borderColor: theme.lineColor,
            borderWidth: 2,
            backgroundColor: gradient,
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: theme.lineColor,
            pointHoverBorderColor: theme.cardColor,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        animation: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: true,
              color: theme.textMuted,
              maxTicksLimit: state.activeRange === "ALL" ? 7 : 6,
              callback(value) {
                const rawLabel = this.getLabelForValue(value);
                return formatAxisDate(rawLabel, state.activeRange);
              },
            },
            border: {
              color: theme.borderColor,
            },
          },
          y: {
            min: yBounds.min,
            max: yBounds.max,
            ticks: {
              color: theme.textMuted,
              callback(value) {
                return `${Number(value).toFixed(1)}%`;
              },
            },
            grid: {
              color: theme.gridColor,
            },
            border: {
              color: theme.borderColor,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              title(items) {
                return formatDate(items[0].label);
              },
              label(item) {
                return formatPercent(item.parsed.y, PERFORMANCE_DECIMALS);
              },
            },
          },
        },
        onHover(_event, activeElements) {
          const index = activeElements[0]?.index;
          if (typeof index !== "number") {
            return;
          }
          const point = chartData[index];
          selectedReturn.textContent = formatPercent(point.returnPct, PERFORMANCE_DECIMALS);
          selectedReturn.className = classForSignedValue(point.returnPct);
          selectedDate.textContent = formatDate(point.date);
        },
      },
    });

    canvas.onmouseleave = () => {
      selectedReturn.textContent = formatPercent(latestPoint?.returnPct ?? 0, PERFORMANCE_DECIMALS);
      selectedReturn.className = classForSignedValue(latestPoint?.returnPct ?? 0);
      selectedDate.textContent = formatDate(latestPoint?.date ?? state.payload.latestTradingDate ?? state.payload.asOfDate);
    };

    selectedReturn.textContent = formatPercent(latestPoint?.returnPct ?? 0, PERFORMANCE_DECIMALS);
    selectedReturn.className = classForSignedValue(latestPoint?.returnPct ?? 0);
    selectedDate.textContent = formatDate(latestPoint?.date ?? state.payload.latestTradingDate ?? state.payload.asOfDate);

    updateRangeButtons(app, state.activeRange);
  }

  function renderAllocationChart(app, payload) {
    const canvas = app.querySelector("#portfolio-allocation-chart");
    const context = canvas.getContext("2d");
    const palette = buildAllocationPalette(payload.holdings.length);

    if (allocationChart) {
      allocationChart.destroy();
    }

    allocationChart = new window.Chart(context, {
      type: "doughnut",
      data: {
        labels: payload.holdings.map((holding) => holding.ticker),
        datasets: [
          {
            data: payload.holdings.map((holding) => holding.weightPct),
            backgroundColor: palette,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: readThemeTokens().textColor,
              boxWidth: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label(item) {
                return `${item.label}: ${formatUnsignedPercent(item.parsed, 2)}`;
              },
            },
          },
        },
      },
    });
  }

  function observeThemeChanges(app, state) {
    themeObserver?.disconnect();
    themeObserver = new MutationObserver(() => {
      renderCharts(app, state);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-setting"],
    });
  }

  function destroyCharts() {
    if (performanceChart) {
      performanceChart.destroy();
      performanceChart = null;
    }
    if (allocationChart) {
      allocationChart.destroy();
      allocationChart = null;
    }
    themeObserver?.disconnect();
    themeObserver = null;
  }

  function filterPerformanceByRange(points, rangeKey) {
    if (rangeKey === "ALL") {
      return points;
    }

    const latestDate = points.at(-1)?.date;
    if (!latestDate) {
      return points;
    }

    let startDate = latestDate;
    if (rangeKey === "1W") {
      startDate = shiftIsoDate(latestDate, -6);
    } else if (rangeKey === "1M" || rangeKey === "3M") {
      const date = new Date(`${latestDate}T00:00:00Z`);
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - (rangeKey === "3M" ? 3 : 1));
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCDate(Math.min(Number(latestDate.slice(8, 10)), lastDay));
      startDate = toIsoDate(date);
    } else if (rangeKey === "YTD") {
      startDate = `${latestDate.slice(0, 4)}-01-01`;
    }

    return points.filter((point) => point.date >= startDate);
  }

  function computeYBounds(values) {
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(maxValue - minValue, 0.8);
    const padding = Math.max(spread * 0.14, 0.35);
    return {
      min: round(minValue - padding, 2),
      max: round(maxValue + padding, 2),
    };
  }

  function updateRangeButtons(app, activeRange) {
    for (const button of app.querySelectorAll("[data-range]")) {
      const isActive = button.dataset.range === activeRange;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function buildAllocationPalette(count) {
    const colors = [
      "#5b7cfa",
      "#18a999",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#0ea5e9",
      "#22c55e",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#6366f1",
      "#84cc16",
      "#06b6d4",
      "#d946ef",
      "#f43f5e",
      "#10b981",
      "#a855f7",
      "#eab308",
    ];

    return Array.from({ length: count }, (_unused, index) => colors[index % colors.length]);
  }

  function readThemeTokens() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--global-theme-color").trim() || "#5b7cfa";
    const cardColor = styles.getPropertyValue("--global-card-bg-color").trim() || "#ffffff";
    const borderColor = styles.getPropertyValue("--global-divider-color").trim() || "rgba(0, 0, 0, 0.12)";
    const textColor = styles.getPropertyValue("--global-text-color").trim() || "#111827";
    const textMuted = styles.getPropertyValue("--global-text-color-light").trim() || "#6b7280";
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    return {
      accent,
      cardColor,
      borderColor,
      textColor,
      textMuted,
      gridColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
      lineColor: "#39c56f",
      areaTop: isDark ? "rgba(38, 152, 186, 0.35)" : "rgba(91, 124, 250, 0.24)",
      areaBottom: isDark ? "rgba(38, 152, 186, 0.02)" : "rgba(91, 124, 250, 0.01)",
    };
  }

  function classForSignedValue(value) {
    if (!Number.isFinite(value)) return "";
    return value < 0 ? "portfolio-negative" : "portfolio-positive";
  }

  function formatPercent(value, digits) {
    if (!Number.isFinite(value)) return "—";
    const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${prefix}${Math.abs(value).toFixed(digits)}%`;
  }

  function formatUnsignedPercent(value, digits) {
    return `${Number(value).toFixed(digits)}%`;
  }

  function formatDate(isoDate) {
    if (!isoDate) {
      return "Date unavailable";
    }
    return DATE_FORMATTER.format(parseIsoCalendarDate(isoDate));
  }

  function formatAxisDate(isoDate, rangeKey) {
    const date = parseIsoCalendarDate(isoDate);
    const shortFormatter =
      rangeKey === "ALL"
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
        : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return shortFormatter.format(date);
  }

  function parseIsoCalendarDate(isoDate) {
    const [year, month, day] = String(isoDate).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function shiftIsoDate(isoDate, days) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoDate(date);
  }

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
})();
