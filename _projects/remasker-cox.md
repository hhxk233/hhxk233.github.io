---
layout: page
title: ReMasker-Cox
description: Survival-guided masked autoencoder that couples imputation with a CoxPH risk signal for clinical tabular data.
img: assets/img/remasker_cox.png
importance: 3
category: ML
giscus_comments: true
---

- **Cox-guided imputation objective.** Added a Cox proportional hazards head on the imputed features and optimized a **joint loss**  
  \[
  \mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda_{\text{cox}}\cdot \mathcal{L}\_{\text{CoxPH}}
  \]
  so the imputer preserves survival risk ordering rather than only minimizing reconstruction error. Implemented in PyCox with end-to-end backprop through the imputer.

- **Training workflow & data path.** Split data into complete/missing subsets, trained the imputer with **random masks**, then computed Cox loss on both **imputed-complete** and **imputed-missing** pathways; wired gradients from the Cox head back into the imputer.

- **Loss-weighting & schedules.** Exposed `lambda_cox` (default **0.5**) and epochs (**600**) as knobs; instrumented dashboards for total loss, internal Cox loss, and C-index to compare against imputation-only baselines.

- **Evaluation suite.** Reported train/test **C-index**, Cox loss improvement, and stability of the Cox weight over time; added figure exports for paper-ready plots.

## Key results

- **Cox loss improves with coupling.** Internal Cox loss drops steadily; summary bars show **9.12%** (train) and **8.24%** (test) improvement at convergence.
- **Concordance is competitive.** Final C-index reaches **0.731** (train) and **0.714** (test) with the Cox-guided imputer.
- **Stable optimization.** The Cox weight remains effectively constant (flat trace), indicating the joint objective is well-conditioned under the chosen schedule.

## Figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/remasker_cox.png" title="End-to-end training graph: imputation + Cox loss backprop to imputer" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/remasker_cox_result.png" title="Training progress: losses, Cox improvement, and C-index" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

## Impact

- **Risk-preserving imputations.** By aligning the imputer with CoxPH, reconstructed features maintain survival structure, improving downstream ranking without a separate post-hoc survival model.
- **Plug-and-play for clinical tables.** The module slots into existing MAE pipelines and yields interpretable survival metrics (C-index, Cox loss) during training.
