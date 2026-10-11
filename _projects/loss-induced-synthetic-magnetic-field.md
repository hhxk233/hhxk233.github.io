---
layout: page
title: Loss-Induced Synthetic Magnetic Field
description: Rotationally asymmetric Si ring–resonator arrays engineered for non-Hermitian skin localization via controllable loss.
img: assets/img/loss_induce_1.png
importance: 3
category: Physics
giscus_comments: false
---

This work was part of my undergraduate research in the Deng Research Lab at the University of Michigan (September 2024–August 2025), advised by Chulwon Lee with faculty instructor Hui Deng. I designed and simulated rotationally asymmetric silicon ring-resonator arrays and compared the field behavior with a non-Hermitian tight-binding model. The results below are computational.

- **Device concept & layout.** Designed a ring-resonator chain with an auxiliary “C/aux” site that introduces _direction-selective loss_, creating an effective gauge flux for photons in Si photonics. Implemented geometric asymmetry (C-shaped etch) to control attenuation without adding gain.

- **3D FDTD pipeline on HPC.** Built reproducible Lumerical FDTD projects and job scripts (GreatLake) to sweep geometry, extract spectra/field maps, and visualize edge localization.

- **Single-ring optimization (1550 nm band).**
  Single-ring simulations provided a high-Q design point for array studies:

  - Si thickness **0.22 µm**, lattice parameter **a = 3 µm**
  - Outer radius **r_out = 0.61 a**, inner radius **r_in = 0.60 r_out**
  - Resonance **λ₀ = 1554.69 nm**, quality factor **Q ≈ 1.19×10⁶**
    These parameters were used to study circulating power and the effect of engineered loss.

- **Inter-ring coupling extraction.** Extracted nearest-neighbor couplings from simulated two-ring spectra:

  - **A–B:** \(J\_{AB} ≈ 4.20\times10^{-4}\)
  - **A–C (two etch periods, 0.02 µm depth):** \(J\_{AC} ≈ 3.57\times10^{-3}\)
  - **B–C (two etch periods, 0.02 µm depth):** \(J\_{BC} ≈ 1.51\times10^{-3}\)
    These calibrated \(J\) values parameterize the tight-binding model and guide array spacing.

- **Array simulations showing localization with engineered loss.**
  Established a **no-loss baseline** with uniform fields and **lossy C-site arrays** showing two-sided field localization in 3D FDTD. The tight-binding analysis helped test how phase and loss asymmetry affect the interpretation of these field patterns.

- **Non-Hermitian tight-binding (NH-TB) analysis & fixes.**
  Built the non-Hermitian tight-binding model for the A/B/C ring unit cell. Eigen-analysis identified zero net loop phase in the symmetric model as a barrier to the skin effect. I explored and validated phase/loss asymmetry and distance-offset remedies in simulation.

- **Documentation & handoff.** Consolidated design parameters, coupling tables, and tight-binding scripts for continued simulation and device-design work.

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

## Modeling outcomes

- Explored engineered loss as a mechanism for asymmetric transport and field localization in silicon ring arrays.
- Extracted quantitative simulation parameters, including quality factors and couplings, to connect geometry sweeps with the tight-binding model.
- Used complementary electromagnetic and tight-binding calculations to test proposed designs before fabrication.
