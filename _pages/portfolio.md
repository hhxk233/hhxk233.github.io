---
layout: page
title: Portfolio Overview
permalink: /portfolio/
description: Normalized percentage performance since 2026-02-02. This page intentionally omits dollar balances, share counts, cost basis, and raw brokerage exports.
nav: false
chart:
  chartjs: true
_styles: |
  .portfolio-overview {
    --portfolio-border: var(--global-divider-color);
    --portfolio-card-bg: var(--global-card-bg-color);
    --portfolio-muted: var(--global-text-color-light);
    --portfolio-positive: #0f9d58;
    --portfolio-negative: #d93025;
    --portfolio-accent: var(--global-theme-color);
    --portfolio-accent-soft: color-mix(in srgb, var(--global-theme-color) 14%, transparent);
    --portfolio-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  }

  .portfolio-shell {
    display: grid;
    gap: 1.5rem;
  }

  .portfolio-state-card,
  .portfolio-panel,
  .portfolio-summary-card {
    background: var(--portfolio-card-bg);
    border: 1px solid var(--portfolio-border);
    border-radius: 1.25rem;
    box-shadow: var(--portfolio-shadow);
  }

  .portfolio-state-card {
    padding: 2rem;
    text-align: center;
  }

  .portfolio-state-card h2 {
    margin-bottom: 0.75rem;
  }

  .portfolio-state-card p {
    margin-bottom: 0;
    color: var(--portfolio-muted);
  }

  .portfolio-spinner {
    width: 2.75rem;
    height: 2.75rem;
    margin: 0 auto 1rem;
    border: 3px solid var(--portfolio-border);
    border-top-color: var(--portfolio-accent);
    border-radius: 999px;
    animation: portfolio-spin 0.9s linear infinite;
  }

  .portfolio-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--portfolio-border);
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--portfolio-accent-soft), transparent 70%);
  }

  .portfolio-banner strong {
    display: block;
    margin-bottom: 0.2rem;
  }

  .portfolio-banner p {
    margin-bottom: 0;
    color: var(--portfolio-muted);
  }

  .portfolio-summary-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .portfolio-summary-card {
    padding: 1.2rem 1.25rem;
  }

  .portfolio-summary-label {
    display: block;
    margin-bottom: 0.45rem;
    color: var(--portfolio-muted);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .portfolio-summary-value {
    display: block;
    font-size: clamp(1.4rem, 2vw, 2rem);
    font-weight: 700;
    line-height: 1.05;
  }

  .portfolio-summary-footnote {
    display: block;
    margin-top: 0.45rem;
    color: var(--portfolio-muted);
    font-size: 0.85rem;
  }

  .portfolio-positive {
    color: var(--portfolio-positive);
  }

  .portfolio-negative {
    color: var(--portfolio-negative);
  }

  .portfolio-panel {
    padding: 1.25rem;
  }

  .portfolio-panel-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .portfolio-panel-header h2 {
    margin-bottom: 0.35rem;
  }

  .portfolio-panel-header p,
  .portfolio-chart-meta {
    margin-bottom: 0;
    color: var(--portfolio-muted);
  }

  .portfolio-chart-focus {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: baseline;
    margin-bottom: 1rem;
  }

  .portfolio-chart-focus strong {
    font-size: clamp(1.5rem, 2.1vw, 2.25rem);
    line-height: 1;
  }

  .portfolio-range-tabs {
    display: inline-flex;
    gap: 0.4rem;
    padding: 0.3rem;
    border: 1px solid var(--portfolio-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--portfolio-card-bg) 92%, var(--portfolio-accent) 8%);
  }

  .portfolio-range-tab {
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--global-text-color);
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }

  .portfolio-range-tab:hover,
  .portfolio-range-tab:focus-visible {
    background: color-mix(in srgb, var(--portfolio-accent) 12%, transparent);
    color: var(--portfolio-accent);
    outline: none;
  }

  .portfolio-range-tab.is-active {
    background: var(--portfolio-accent);
    color: var(--global-hover-text-color);
    transform: translateY(-1px);
  }

  .portfolio-chart-wrap {
    position: relative;
    min-height: 340px;
  }

  .portfolio-chart-canvas {
    width: 100%;
    height: 340px;
  }

  .portfolio-allocation-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  }

  .portfolio-allocation-chart {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 300px;
    padding: 0.25rem;
  }

  .portfolio-allocation-chart canvas {
    max-height: 300px;
  }

  .portfolio-holdings-table-wrap {
    overflow-x: auto;
  }

  .portfolio-holdings-table {
    width: 100%;
    border-collapse: collapse;
  }

  .portfolio-holdings-table th,
  .portfolio-holdings-table td {
    padding: 0.9rem 0.75rem;
    border-bottom: 1px solid var(--portfolio-border);
    vertical-align: middle;
  }

  .portfolio-holdings-table th {
    color: var(--portfolio-muted);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .portfolio-holdings-table tr:last-child td {
    border-bottom: 0;
  }

  .portfolio-holding-name {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 220px;
  }

  .portfolio-holding-name strong {
    font-size: 1rem;
  }

  .portfolio-holding-name span {
    color: var(--portfolio-muted);
    font-size: 0.9rem;
  }

  .portfolio-weight-cell {
    min-width: 180px;
  }

  .portfolio-weight-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
  }

  .portfolio-weight-bar-track {
    position: relative;
    width: 100%;
    height: 0.48rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--portfolio-border) 72%, transparent);
    overflow: hidden;
  }

  .portfolio-weight-bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--portfolio-accent), color-mix(in srgb, var(--portfolio-accent) 60%, white));
  }

  .portfolio-empty-list {
    margin-top: 1rem;
    color: var(--portfolio-muted);
    font-size: 0.95rem;
  }

  @keyframes portfolio-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 991px) {
    .portfolio-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .portfolio-allocation-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .portfolio-summary-grid {
      grid-template-columns: 1fr;
    }

    .portfolio-panel,
    .portfolio-summary-card,
    .portfolio-state-card {
      padding: 1rem;
    }

    .portfolio-chart-canvas {
      height: 300px;
    }

    .portfolio-weight-cell {
      min-width: 150px;
    }
  }
---

<div
  id="portfolio-overview-app"
  class="portfolio-overview"
  data-endpoint="{{ '/assets/json/portfolio-data.json' | relative_url }}"
></div>

<script src="{{ '/assets/js/portfolio-page.js' | relative_url | bust_file_cache }}"></script>
