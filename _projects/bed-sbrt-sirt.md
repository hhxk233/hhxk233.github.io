## <!-- File: bed-sbrt-sirt.md -->

layout: page
title: Unified BED for SBRT vs 90Y SIRT
description: Voxel-level liver function dose–response aligning SBRT EQD2 with protraction-aware SIRT BED.
img: assets/img/PLACEHOLDER_bed-sbrt-sirt.jpg
importance: 3
category: ML
giscus_comments: true
related_publications: true

---

## Overview

We unify radiobiological scales across SBRT and **90Y SIRT** to compare _voxel-level_ liver parenchyma response, using DGAE-MRI \(k1(x)\) maps and CT-based dosimetry.

<!-- <div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/PLACEHOLDER_bed-pipeline.png" title="Pipeline overview (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">Replace with a schematic of registration, masking, and dose-binning.</div> -->

## Methods

- Register DGAE-MRI **k1(x)** to CT; define parenchyma masks; perform dose binning on post-therapy %Δk1.
- Convert SBRT to **EQD2** (LQ model); compute SIRT **BED** with Lea–Catcheside protraction kernel.
- Model SIRT micro-nonuniformity via **EUD**; fit mixed-effects 4-parameter logistic dose–response with covariates.
- Calibrate repair rate **μ** and micro-dose CV **c** to align SBRT/SIRT curves; bootstrap uncertainty.

## Results (highlights)

- Consistent dose–response after scale harmonization; improved comparability across modalities.
- EUD captures subvoxel heterogeneity, stabilizing SIRT response estimation.

## My contributions

Data pipeline, registration + binning, EQD2/BED harmonization, EUD modeling, mixed-effects fitting, uncertainty analysis.

## Tools

Python, ITK/ANTs, NumPy/Pandas, PyTorch (for fitting), statsmodels, plotting.

## Links & Artifacts

- Add internal doc / preprint links here.
- Replace with figures (dose–response curves, residuals, bootstrap CIs).

<!-- <div class="row justify-content-sm-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_dose-response.png" title="Dose–response curve (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_violin-bootstrap.png" title="Bootstrap CI (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
</div> -->
