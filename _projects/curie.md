---
layout: page
title: Curie — Automate Rigorous Scientific Experimentation
description: Contributions to a LangGraph-based multi-agent system for rigorous experiment loops with plan-scoped memory.
img: assets/img/curie_research-lifecyle.png
importance: 3
category: fun
giscus_comments: false
---

## What I built

- **Per-experiment logging scaffold.** Created an auto-named run folder for every iteration to keep artifacts (configs, plots, reports, checkpoints) isolated and reproducible.
  _Example pattern:_ `logs/{workspace}_{uid}_iter{n}`

- **Plotting + reporting workflow.** Added a reusable plotting prompt/template and captions in the experiment report so each run yields publication-ready visuals with consistent narrative.

- **User-friendly log controls.** Introduced a JSON config to customize what gets logged (filters, action names, fields), making debug and auditing simpler without code edits.

- **Token-cost trimming (in progress).** Prototyped memory pruning to drop redundant messages and retain only salient state, aimed at lowering run cost while maintaining fidelity.

- **System documentation.** Wrote a concise framework summary to onboard contributors faster and align on the core loop (plan → execute → analyze → reflect).

- **Applied use case & critique.** Analyzed MCM 2024 Problem B as a stress test: surfaced code-writing inefficiency and missing search-strategy design after model prediction, informing priorities for planner and tooling.

## Impact

- Faster iteration cycles from clean run separation and templated reporting.
- Lower cognitive load for debugging via configurable logs.
- Clearer roadmap for memory efficiency and planner/search improvements.

## Artifacts

- Repo: <https://github.com/Just-Curieous/Curie>
- Plotting template: `curie/prompts/exp-plotting.txt`
- Log config: `Curie/curie/configs/log_config.json`
- Framework summary (overview doc)
- Research lifecycle figure (replace placeholder image with `assets/img/curie_research-lifecyle.png`)

## Notes for the reviewer

- The logging scaffold and config are designed to be drop-in across tasks.
- Memory-pruning experiments live on a branch and are safe to toggle while iterating.
