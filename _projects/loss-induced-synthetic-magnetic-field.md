## <!-- File: loss-induced-synthetic-magnetic-field.md -->

layout: page
title: Loss-Induced Synthetic Magnetic Field
description: Rotationally asymmetric Si ring–resonator arrays showing two-sided non-Hermitian skin effect.
img: assets/img/PLACEHOLDER_smf.jpg
importance: 3
category: Physics
giscus_comments: true

---

## Summary

Designed & simulated ring-resonator arrays where **loss asymmetry** induces an effective gauge field and skin localization in 3D FDTD.

## Theory & Design

- Non-Hermitian tight-binding model; eigen-analysis revealed zero net loop phase barrier.
- Remedies: phase/loss asymmetry + distance-offset; validated by FDTD.

## My contributions

Device layout, simulation sweeps, NH-TB modeling, interpretation.

<div class="row justify-content-sm-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_skin-field.png" title="Field localization (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_tb-spectrum.png" title="NH-TB spectrum (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Tools

ANSYS Lumerical FDTD, MATLAB; GreatLake HPC.
