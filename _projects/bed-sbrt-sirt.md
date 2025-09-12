---
layout: page
title: Unified BED for SBRT vs 90Y SIRT
description: Voxel-level liver function dose–response aligning SBRT EQD2 with protraction-aware SIRT BED and subvoxel EUD.
img: assets/img/dose_response_SIRT_SIRT_EUD_vs_SBRT.png
importance: 3
category: ML
giscus_comments: true
related_publications: true
---

## Overview

We present a unified radiobiological scale to compare **SBRT** and **90Y SIRT** on voxel-level liver function, using DGAE-MRI \(k1(x)\) maps registered to CT/PET dosimetry. SBRT dose is mapped to **EQD2** via LQ; SIRT uses a **protraction-aware BED** with Lea–Catcheside repair and an **EUD** correction for subvoxel micro-nonuniformity. Mixed-effects **4-parameter logistic (4PL)** models yield modality-specific curves that we align by estimating repair rate \( \mu \) and micro-dose coefficient of variation \( c \).

<div class="row justify-content-sm-center">
  <div class="col-sm-10 mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/dose_response_SIRT_SIRT_EUD_vs_SBRT.png" title="Dose–response (4PL): SBRT vs SIRT with subvoxel nonuniformity (EUD)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">Median %Δk1 per dose bin vs EQD2. SIRT curves shown with EUD (examples: c=0.2, 0.4) reduce apparent effect at higher mean dose compared with SBRT (c=0). Parameters are estimated within the unified framework described below.</div>

## Methods (summary)

- **Registration & masks.** Rigid/deformable MRI→CT; parenchyma mask \( \mathrm{VL} \) excludes vessels and tumor margins; common grid resampling.
- **Endpoint.** %Δk1(x) between baseline and first post-therapy (4–8 weeks), binned by dose with median per bin and sample counts.
- **SBRT ↦ EQD2.** \( \mathrm{BED}\_{\text{SBRT}} = n d \left(1+\frac{d}{\alpha/\beta}\right) \), \( \mathrm{EQD2}=\mathrm{BED}/\left(1+2/(\alpha/\beta)\right) \).
- **SIRT protraction.** \( \mathrm{BED}\_{\text{SIRT}} = D\!\left(1+\frac{D}{\alpha/\beta}\frac{\lambda}{\lambda+\mu}\right) \) for exponential dose-rate; map to EQD2 as above.
- **Subvoxel EUD (SIRT).** Model micro-dose dispersion with CV \(c\); define \(D\_{\mathrm{EUD}}\) by equating expected survival \(S(D,c)\) to an LQ-equivalent uniform dose.
- **Model.** Robust mixed-effects **4PL** with modality and clinical covariates (e.g., ALBI, AST/ALT) and patient random effects; t-likelihood for bin medians.
- **Calibration.** Estimate \( (\hat c,\hat\mu) \) by minimizing weighted discrepancies between SBRT and SIRT 4PL curves; bootstrap for CIs and uncertainty propagation.

## Results (highlights)

- After harmonization, SBRT and SIRT yield consistent monotone %Δk1 vs EQD2 curves; EUD stabilizes SIRT response at higher doses.
- The unified fit supports practical reporting of **D50**, low-dose asymptote, and maximal loss (plateau) per modality and cohort—plus calibrated \( (c,\mu) \) for planning studies.

## My contributions

Data curation & registration, parenchyma binning, EQD2/BED unification, EUD modeling, mixed-effects fitting, calibration & bootstrap, visualization.

## Tools

Python, ITK/ANTs, NumPy/Pandas, PyTorch (fitting), statsmodels, Matplotlib; PET/SPECT MC or kernel-based dosimetry as available.
