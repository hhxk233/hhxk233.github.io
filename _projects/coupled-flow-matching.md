---
layout: page
title: Coupled Flow Matching (CPFM)
description: Controllable dimensionality reduction with generalized Gromov–Wasserstein OT and Dual Conditional Flow Matching (DCFM) for bidirectional sampling p(y|x) and p(x|y).
img: assets/img/grid_AFHQ.png
importance: 3
category: ML
giscus_comments: true
related_publications: true
---

> **Paper:** _Coupled Flow Matching_ — Wenxi Cai, **Yuheng Wang**, Naichen Shi (arXiv:2510.23015, v1, Oct 27, 2025).

## TL;DR

**CPFM** is a two-stage framework that (1) builds a _controllable_ coupling between data \(x\) and a low-dimensional embedding \(y\) using a **kernelized generalized Gromov–Wasserstein OT**, and (2) learns **dual conditional flows** that sample \(p(y\!\mid\!x)\) and \(p(x\!\mid\!y)\) with a shared drift network. You choose which semantics live explicitly in \(y\); the rest stays recoverable through the data-space flow.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    <!-- Embed PDF schematic for the CPFM pipeline -->
    <object data="{{ 'assets/img/method_sketch.pdf' | relative_url }}" type="application/pdf" width="100%" height="600px">
      <a href="{{ 'assets/img/method_sketch.pdf' | relative_url }}">Download the CPFM pipeline schematic (PDF)</a>
    </object>
  </div>
</div>
<div class="caption">CPFM schematic: (i) kernelized GWOT couples {x}↔{y}; (ii) DCFM with a shared drift samples p(y|x) and p(x|y).</div>

## Why this matters

Classical DR (PCA, t-SNE, UMAP) compresses data but sheds information that is hard to reconstruct. CPFM cleanly separates **what you retain** (explicit latent semantics) from **what you compress** (residuals recovered by a learned flow), enabling faithful reconstructions _and_ interpretable embeddings.

## Core ideas

- **Kernelized generalized GWOT**  
  Encode priors—labels, graphs, or similarity kernels—directly in the transport cost to align \(x\)-space relations with \(y\)-space geometry. Alternating minimization with entropic regularization gives a scalable **\(O(n^2)\)** per-iteration solver.
- **Dual Conditional Flow Matching (DCFM)**  
  One shared drift network with a role flag \(r\) learns **both** directions: a latent-space flow for \(p(y|x)\) and a data-space flow for \(p(x|y)\). A mute-masking strategy keeps gradients from interfering between roles.
- **Controllability by design**  
  You pick which semantic factors populate \(y\); complementary information is preserved implicitly in the flow weights, staying recoverable during \(x\) reconstruction.

## Method at a glance

1. **Stage A — Controllable coupling (GWOT).**  
   Build a coupling \(\pi\_{\text{OT}}\) between discrete samples of \(x\) and \(y\) using a kernel \(k(x,x')\) that encodes structure or labels. Optimize via entropic, alternating updates (Sinkhorn + closed-form auxiliary update).
2. **Stage B — Extend to the full space (DCFM).**  
   Train a shared conditional flow to sample \(p(y|x)\) or \(p(x|y)\) by toggling a role flag \(r\in\{0,1\}\). Inference integrates the learned ODE in the chosen space from a simple base distribution.

{% comment %}

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_gwot-kernel.png" title="Kernelized GWOT (placeholder): aligning x-relationships with y-geometry" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/PLACEHOLDER_dual-flow.png" title="Dual conditional flows (placeholder): shared drift, role flag r" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
{% endcomment %}

## Results (snapshots)

- **Datasets:** MNIST, CIFAR-10, TinyImageNet, AFHQ (images) and **QM9** (molecules).
- **Setup:** Severely compressed **2-D** latent space for direct visualization—stress-testing both DR and reconstruction.
- **Findings:**
  - **Semantically rich embeddings** that respect label/structure priors from kernels.
  - **Higher-fidelity reconstructions** than representative DR/generative baselines under the same compression.
  - On images: tighter alignment to prescribed latent marginals (e.g., Gaussian, square, circle) while keeping class separation.
  - On QM9: smooth variation of molecular properties (e.g., dipole moment) across the 2-D latent map with faithful topology on reconstruction.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/grid_MNIST.png" title="Embeddings grid: MNIST (2-D latent)" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/grid_CIFAR.png" title="Embeddings grid: CIFAR-10 (2-D latent)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/grid_AFHQ.png" title="Embeddings grid: AFHQ (2-D latent)" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/recon_real.png" title="Reconstructions: original vs CPFM (examples)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/TINY_GWOT.png" title="TinyImageNet: GWOT-shaped embedding" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/TSNE.png" title="t-SNE of learned embeddings" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/guassian.png" title="Gaussian-shaped latent prior (target distribution)" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

> **Table placeholder:** Replace with quantitative metrics (e.g., Distance-to-Gaussian, FID/LPIPS where applicable) comparing PCA / t-SNE / UMAP / VAE / DiffAE / Info-Diffusion / **CPFM**.

## Practical notes

- **Kernel design:** Plug in appearance+label kernels for images or structure+property kernels for molecules to steer the embedding.
- **Solver:** Entropy-regularized alternating optimization with ε-scheduling; **per-iteration \(O(n^2)\)** complexity.
- **Training:** Shared network with two heads gated by role flag; Euler ODE integration at test time.
- **Latent choice:** 2-D shown here for interpretability; higher-D \(y\) is supported.

## Resources

- **arXiv:** arXiv:2510.23015 (v1).
- **Code:** add repo link when available (paper references an anonymous artifact; replace with public repo upon release).

## BibTeX

```bibtex
@article{cai2025cpfm,
  title   = {Coupled Flow Matching},
  author  = {Cai, Wenxi and Wang, Yuheng and Shi, Naichen},
  journal = {arXiv preprint arXiv:2510.23015},
  year    = {2025}
}
```
