## <!-- File: remasker-cox.md -->

layout: page
title: ReMasker-Cox — Survival-Guided Masked Autoencoder
description: Joint imputation + CoxPH risk consistency for clinical tabular data with missingness.
img: assets/img/PLACEHOLDER_remasker-cox.jpg
importance: 3
category: ML
giscus_comments: true

---

## Problem

Imputation often distorts survival risk structure. We couple a masked-autoencoder objective with a **Cox proportional hazards** loss to preserve risk.

## Approach

- Random masking during training; dual loss = reconstruction + CoxPH partial likelihood.
- Risk-preserving validation: concordance, calibration vs. imputation-only baselines.

## My contributions

Model design, training workflow, loss weighting, evaluation pipeline.

## Results (to add)

- Concordance↑ vs. baselines on held-out cohorts.
- Risk rank stability across missingness regimes.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/PLACEHOLDER_arch.png" title="Model architecture (placeholder)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">Replace with an encoder–decoder diagram and Cox head.</div>

## Repo / Notes

- Add Git repo or internal note links here.
