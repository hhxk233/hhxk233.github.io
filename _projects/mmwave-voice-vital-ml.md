---
layout: page
title: mmWave Respiration & Voice Sensing
description: End-to-end 77-GHz FMCW pipeline for breathing/heartbeat from phase, with YOLOv8 camera guidance, real-time GUI, and hardware rig.
img: assets/img/fig1_mm.png
importance: 3
category: ML
giscus_comments: false
---

## What I built

- **Signal-processing pipeline (FMCW).** Implemented range-bin tracking → phase extraction → unwrap → band-pass filtering → spectral estimation and decision logic. Separate bands: **0.1–0.6 Hz** (breathing) and **0.8–4.0 Hz** (heart). Added motion-corruption detection and segment buffering so outliers are discarded before rate estimation.

- **Real-time target selection.** Added **range-FFT–based bin update** every few seconds to keep lock on the subject while seated movement occurs; reduces drift and false peaks.

- **Vision-guided sensing.** Integrated **YOLOv8 person detection** to suggest a pointing region for the radar and to overlay the active ROI in the UI, improving setup speed and repeatability in demos.

- **Interactive GUI + logging.** Built a PyQt interface that displays **breaths-per-minute** live, starts/stops acquisition, and saves outputs (phase traces and rate estimates) for later analysis.

- **Hardware bring-up.** Mounted camera + mmWave front-end on a clear acrylic frame, wired to a PC for streaming and processing; documented chirp and sampling parameters used during tests.

## Figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/fig1_mm.png" title="Processing flow and typical chirp parameters" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/fig2_mm.png" title="Live GUI with YOLOv8 guidance and BPM overlay" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/fig3_mm.png" title="Bench setup: camera + radar frontend + PC" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Impact

- **Robust rates from micro-motion.** Phase-domain processing with motion-rejection yields stable respiration estimates even with small posture changes.
- **Operator-friendly demos.** Vision guidance and a simple GUI shorten calibration time and make results understandable to non-experts.
- **Reproducible stack.** Clear module boundaries (tracking, filtering, spectral pick, decision) and saved sessions enable fast iteration on models and parameters.

## Notes

- Breathing is computed from the dominant spectral peak in the 0.1–0.6 Hz band; heart rate uses 0.8–4.0 Hz with peak consistency checks across buffered segments.
- The UI records raw and filtered phase for offline comparisons (FFT vs. autocorrelation), enabling ablation of each stage.
