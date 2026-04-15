---
layout: page
title: Loss-Induced Synthetic Magnetic Field
description: Rotationally asymmetric Si ring–resonator arrays engineered for non-Hermitian skin localization via controllable loss.
img: assets/img/loss_induce_1.png
importance: 3
category: Physics
giscus_comments: false
---

- **Device concept & layout.** Designed a ring-resonator chain with an auxiliary “C/aux” site that introduces _direction-selective loss_, creating an effective gauge flux for photons in Si photonics. Implemented geometric asymmetry (C-shaped etch) to control attenuation without adding gain.

- **3D FDTD pipeline on HPC.** Built reproducible Lumerical FDTD projects and job scripts (GreatLake) to sweep geometry, extract spectra/field maps, and visualize edge localization.

- **Single-ring optimization (1550 nm band).**
  Achieved ultra-high-Q operation and a clear design point for arraying:

  - Si thickness **0.22 µm**, lattice parameter **a = 3 µm**
  - Outer radius **r_out = 0.61 a**, inner radius **r_in = 0.60 r_out**
  - Resonance **λ₀ = 1554.69 nm**, quality factor **Q ≈ 1.19×10⁶**
    These conditions maximize circulating power and the sensitivity of loss engineering.

- **Inter-ring coupling extraction.** Measured nearest-neighbor couplings from two-ring spectra:

  - **A–B:** \(J\_{AB} ≈ 4.20\times10^{-4}\)
  - **A–C (two etch periods, 0.02 µm depth):** \(J\_{AC} ≈ 3.57\times10^{-3}\)
  - **B–C (two etch periods, 0.02 µm depth):** \(J\_{BC} ≈ 1.51\times10^{-3}\)
    These calibrated \(J\) values parameterize the tight-binding model and guide array spacing.

- **Array simulations showing localization with engineered loss.**
  Established **no-loss baseline** (uniform fields) and **lossy “C-site” arrays** that exhibit **two-sided skin accumulation** in steady-state fields—consistent with a synthetic magnetic bias introduced by asymmetric

- **Non-Hermitian tight-binding (NH-TB) analysis & fixes.**
  Wrote the NH-TB model for the A/B/C ring unit cell; initial symmetric phases produced zero net loop phase (no skin effect). Proposed and prioritized remedies now in the sim queue: (1) _phase/loss asymmetry_ between forward/backward hops, (2) _distance offsets_ \(d*{A_1B_1} \neq d*{B*1A_2}\), and (3) \_site-dependent loss*.

- **Documentation & handoff.** Consolidated design rules, optimal dimensions, coupling tables, and NH-TB scripts for rapid continuation of fabrication-ready layouts.

## Figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/loss_induce_1.png" title="Lattice concept with aux (loss) sites" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/loss_induce_2.png" title="Si ring chain; etched C-sites" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/loss_induce_3.png" title="Local loss inducing loop bias & skin effect" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Impact

- Provides a **pure-loss route** to synthetic magnetic flux and skin localization in a CMOS-compatible platform.
- Delivers **quantitative design knobs** (Q, \(J\_{ij}\), etch depth/periods) that translate directly into mask layouts and scalable arrays.
- Establishes a **validated sim + NH-TB loop** for exploring non-Hermitian photonic transport before fabrication.
