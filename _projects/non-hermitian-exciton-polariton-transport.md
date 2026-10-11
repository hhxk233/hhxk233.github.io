---
layout: page
title: Non-Hermitian Exciton–Polariton Transport
description: 3D-FDTD nanobeam–grating design, parameter sweeps, and a loss-engineered resonator platform toward PT-symmetry breaking.
img: assets/img/grating_schemetic.png
importance: 3
category: Physics
giscus_comments: false
---

<blockquote>
  <p>
    <strong>Deng Research Lab, University of Michigan · September 2024–August 2025.</strong><br>
    <strong>Advisor:</strong> Chulwon Lee. <strong>Faculty instructor:</strong> Hui Deng.<br>
    <strong>Related manuscript:</strong> <em>Harnessing nanophotonic edgemodes by engineering PT symmetry</em> — submitted.
  </p>
</blockquote>

My work combined nanobeam–grating simulations in Ansys Lumerical with preparation of monolayer MoSe₂ samples. The design and field results below are from the simulation work.

## What I built

- **3D-FDTD stack for nanobeam + apodized grating**
  Ported the prior 2D workflow to full **3D FDTD** on GreatLake, rebuilt monitors (out-coupled power, waveguide transmission), and automated sweeps over the **initial fill factor \(F_0\)** and **linear apodization \(R\)** for a Si₃N₄ nanobeam cavity. The simulated operating point was approximately \(R\_{\text{opt}}=0.034\) and \(F\_{0,\text{opt}}=0.62\), chosen to maximize collected power near the design wavelength.

- **Design rules from effective-index apodization**
  Implemented the index mixing model \(n\_{\mathrm{eff}}(z)=F(z)n_O+(1-F(z))n_E,\; F(z)=F_0+Rz\) to generate **segment lengths and duty cycles** from \(\Lambda_i=\lambda_c/n\_{\mathrm{eff},i}\), producing grating period and trench width tables for the design workflow.

- **Loss-engineered resonator chain for non-reciprocal transport**
  Proposed and simulated a **C-site (aux) lossy ring** coupled to A/B rings to study **direction-selective dissipation**, synthetic magnetic bias, and **non-Hermitian skin accumulation**. Simulated single-ring optimization near \(\lambda_0\approx1554.7\,\mathrm{nm}\) with \(Q\sim1.19\times10^6\), extracted nearest-neighbor couplings \(J\_{AB},J\_{AC},J\_{BC}\), and built the non-Hermitian tight-binding model to diagnose net loop phase.

- **Integrated polariton device concept**
  Sketched a Si₃N₄ nanobeam cavity coupled to apodized gratings and over-layered **hBN/MoSe₂** to form exciton–photon hybrids; outlined the measurement layout and monitors for induced light and out-coupled emission as groundwork for **PT-symmetry tests of edge modes**.

## Modeling outcomes

- Parameter sweeps connected grating geometry to simulated out-coupled power and guided the choice of design parameters.
- Comparing electromagnetic simulations with the tight-binding model identified cancellation of net loop phase and motivated tests of phase and loss asymmetry.
- The integrated cavity, grating, and 2D-material design provided a starting point for later polariton experiments.

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

- Grating dimensions are generated from the \(n\_{\mathrm{eff}}\) model; simulation monitors report out-coupled far-field and in-plane power.
- For the non-Hermitian chain, eigen-analysis identified cancellation of net loop phase in the symmetric model. Phase/loss asymmetry and distance offsets were explored as remedies in simulation; see [Loss-Induced Synthetic Magnetic Field]({{ '/projects/loss-induced-synthetic-magnetic-field/' | relative_url }}).
