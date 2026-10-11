---
layout: page
title: A Common Biological Dose Scale for SBRT and SIRT
description: Imaging-derived liver response and biological dose modeling; conference abstract at ASTRO 2026.
img: assets/img/dose_response_SIRT_SIRT_EUD_vs_SBRT.png
importance: 1
category: ML
giscus_comments: false
related_publications: true
---

<blockquote>
  <p>
    <strong>University of Michigan, Department of Radiation Oncology · May 2025–May 2026.</strong><br>
    <strong>Advisor:</strong> Lise Wei.<br>
    <strong>Conference abstract:</strong> ASTRO 2026, Quick Pitch session QP 18, abstract 1106. Presented by Lise Wei on September 28, 2026.
  </p>
</blockquote>

## Overview

Our team studied whether imaging-derived liver functional response after **SBRT** and **Y-90 SIRT** can be compared on a common biological dose scale. The published conference abstract reports a joint calibration of biological dose conversion and a shared logistic response model. {% cite wang2026common %}

## Published abstract

- **Cohort:** 24 SBRT and 9 SIRT patients, with liver MRI before and one month after treatment.
- **Method:** Convert dose to EQD2, account for SIRT dose protraction and subvoxel heterogeneity through an equivalent uniform dose (EUD) model, and jointly fit a shared four-parameter logistic response.
- **Result:** The pooled fit reported \(R^2=0.72\) and \(D\_{50,\mathrm{EQD2}}=37.1\,\mathrm{Gy}\).

The work appears as a **conference abstract** in the _International Journal of Radiation Oncology, Biology, Physics_, 126(1), S227 ([DOI](https://doi.org/10.1016/j.ijrobp.2026.06.483)). The [ASTRO program](https://amportal.astro.org/sessions/qp-18-22910/toward-a-common-biological-dose-scale-for-sbrt-and-sirt-using-imaging-derived-liver-functiona-112486) provides the abstract and presentation details.

## My contribution

I modeled subvoxel SIRT nonuniformity using EUD, fit mixed-effects logistic dose-response models with covariates, and calibrated repair rate and micro-dose variation by aligning SBRT/SIRT curves with bootstrap uncertainty. I co-authored the conference abstract.

## Earlier exploratory analysis

<div class="row justify-content-sm-center">
  <div class="col-sm-10 mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/dose_response_SIRT_SIRT_EUD_vs_SBRT.png" alt="Earlier exploratory SBRT and SIRT dose-response curves with different subvoxel EUD assumptions" title="Exploratory dose-response analysis" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">Earlier exploratory comparison of SBRT and SIRT with alternative subvoxel EUD assumptions. This figure predates the shared-fit results reported in the ASTRO abstract.</div>
