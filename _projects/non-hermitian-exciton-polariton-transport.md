---
layout: page
title: Non-Hermitian Exciton–Polariton Transport
description: 3D-FDTD nanobeam–grating design, parameter sweeps, and a loss-engineered resonator platform toward PT-symmetry breaking.
img: assets/img/grating_schemetic.png
importance: 3
category: Physics
giscus_comments: false
---

## What I built

- **3D-FDTD stack for nanobeam + apodized grating**
  Ported the prior 2D workflow to full **3D FDTD** on GreatLake, rebuilt monitors (out-coupled power, waveguide transmission), and automated sweeps over the **initial fill factor \(F_0\)** and **linear apodization \(R\)** for a Si\(_3\)N\(\_4\) nanobeam cavity. Reported operating point around \*\*\(R_{\text{opt}}\approx0.034\)** and **\(F\_{0,\text{opt}}\approx0.62\)\*\* that maximizes collected power near the design wavelength.

- **Design rules from effective-index apodization**
  Implemented the index mixing model \(n*{\mathrm{eff}}(z)=F(z)n_O+(1-F(z))n_E,\; F(z)=F_0+Rz\) to generate **segment lengths and duty cycles** directly from \(\Lambda_i=\lambda_c/n*{\mathrm{eff},i}\). This yields fabrication-ready **grating period and trench width tables** instead of ad-hoc tuning.

- **Loss-engineered resonator chain for non-reciprocal transport**
  Proposed and simulated a **C-site (aux) lossy ring** coupled to A/B rings to create **direction-selective dissipation**—a _pure-loss_ route to synthetic magnetic bias and potential **non-Hermitian skin accumulation**. Delivered single-ring optimization near **\(\lambda_0\approx1554.7\,\mathrm{nm}\)** with **\(Q\sim1.19\times10^6\)**, extracted nearest-neighbor couplings \(J*{AB},J*{AC},J\_{BC}\), and built the NH tight-binding model to diagnose net loop phase.

- **Integrated polariton device concept**
  Sketched a Si\(\_3\)N\(\_4\) nanobeam cavity butt-coupled to apodized gratings and over-layered **hBN/MoSe\(\_2\)** to form exciton–photon hybrids; outlined measurement layout and monitors for induced light and out-coupled emission—groundwork for **PT-symmetry tests of edge modes**.

## Impact

- **From pretty fields to knobs:** Converted FDTD into **parameterized sweeps** that return actionable \((F_0,R)\) regions and power maps, shortening iteration to mask.
- **Bridged simulation and theory:** Calibrated TB parameters from EM spectra, exposing where **net loop phase cancels** and what geometric/loss asymmetries to change next.
- **Path to reciprocity-beyond transport:** Established a **CMOS-compatible, gain-free** route (engineered loss) that can be layered with 2D materials for polaritonic experiments.

## Figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/grating.png" title="3D-FDTD layout & heatmaps for apodized grating sweeps" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/grating_schemetic.png" title="Nanobeam–grating + hBN/MoSe₂ stack for polariton transport" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Notes for reviewers

- Grating tables are generated from the \(n\_{\mathrm{eff}}\) model and exported for litho; monitors report out-coupled far-field and in-plane power.
- For the NH chain, the current layout is symmetric in phase; next steps: **distance offsets** \(d*{A_1B_1}\neq d*{B_1A_2}\), **loss imbalance** on C, and **phase-biased couplers** to force nonzero loop phase.
