---
layout: page
title: PT-Symmetric Wireless Power Transfer
description: Chip-scale WPT architecture using coupled-oscillator phase control (Kuramoto/Adler) and PT-symmetric coupling to maximize transfer efficiency and robustness.
img: assets/img/fig1.png
importance: 3
category: EE
giscus_comments: true
---

- **Coupled-oscillator WPT architecture.**  
  Modeled a transmitter–receiver chain as **bidirectionally injected oscillators** and extended it to a **2n-node array** with alternating oscillator types and asymmetric links, enabling **PT-symmetric** operating points that concentrate energy at the load. I derived lock conditions from **Adler** and **Kuramoto** dynamics and mapped them to circuit parameters (natural frequencies, \(k\_{ij}\)).

- **Phase-programming strategy.**  
  Designed a minimal control law to tune the **coupling phase** and **frequency detuning** so the array settles into the desired PT phase (exact ↔ broken) depending on load and coil separation. This yields predictable **phase gradients** and **power flow directionality** without high-Q matching networks.

- **MATLAB simulation suite.**  
  Implemented time-domain integration of the phase equations for 2–10 oscillators; extracted **phase-difference traces** and lock ranges under parameter sweeps and injected noise. Identified stable windows where long-baseline phase differences remain flat and outliers flag desynchronization (see Fig. “phase difference”).

- **Circuit path in Cadence.**  
  Prototyped a **VCO-based element** with current-injection ports acting as tunable couplers/phase shifters; built small arrays to verify locking and measure control authority. Documented device choices and the build process for replication.

- **System readouts.**  
  Defined measurements (beat-note spectra, lock time, phase offsets at taps, TX/RX power) and scripts to convert them into **transfer-efficiency** and **stability** metrics across loads and misalignments.

## Key results

- **Locking & stability.**  
  The array maintains near-constant phase gaps across distant nodes in the **exact-PT region**; spikes in the traces correspond to **edge case detuning** or intentional perturbations used to map the transition to **broken-PT** (energy localization at the receiver).

- **Hardware feasibility.**  
  VCO-injection cells in Cadence provide sufficient tuning range to realize the required \(k\_{ij}\) and detunings, supporting on-chip implementation without bulky passives.

## Figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/fig1.png" title="Two-oscillator element with bidirectional injection (Adler/Kuramoto base)" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/fig2.png" title="2n-node chain with alternating types and asymmetric couplings (PT-symmetric layout)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/fig4.png" title="Phase-difference traces across nodes under perturbations" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/fig6.png" title="Cadence prototype of the coupled VCO element" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Impact

- **Directional, robust WPT.** Phase-programmed coupling steers energy **without** tight matching, improving tolerance to load/position drift.
- **Scalable control.** The same Kuramoto/Adler-based law extends from a 2-oscillator pair to multi-node arrays, enabling **chip-scale power grids** with software-settable flow.
- **Implementation-ready.** Cadence cells and measured tuning ranges ground the theory in **fabricable** VCO-injection hardware.

## Notes

- Next steps: tape-out of the VCO-injection cell, coil-coupling extraction for post-layout \(k\_{ij}\), and closed-loop firmware to nudge the array to a target PT phase in real time.
