---
layout: page
title: Epidemic Dynamics as Phase Transitions
description: Modeling discontinuous outbreak transitions under finite testing/isolation and validating with cellular automata & ODE analysis.
img: assets/img/epidamic_schemetic.png
importance: 3
category: ML
giscus_comments: false
---

- **Extended SEIRQ model with finite isolation capacity.**
  Formulated an ODE system with compartments S, E, I, Q, R and a hard cap on isolation throughput via `min(κ, δI)` to capture **testing/quarantine saturation**. Derived equilibria and the basic reproduction number using the next-generation matrix, then proved the **outbreak onset at \(R_0=1\)** and located the **discontinuous jump** when \(I\) hits κ.

- **Closed-form thresholds for “jump” outbreaks.**
  Obtained a practical condition linking \(\beta\), κ, and re-susceptibility rates \(f_1, f_2\) to predict the **critical β where cases surge despite controls**; validated accuracy against simulation peaks.

- **CA simulator with realism knobs.**
  Reproduced Nature Comms–style cellular-automaton results and added two levers often missing in baseline demos:

  1. **Population density** (random long-range contacts scale with density)
  2. **Community lockdown** (grid sub-blocks sealed when positives exceed a threshold).
     This shows higher stochasticity and earlier tipping under broader contacts, aligning with the analytical thresholds.

- **Policy-readable artifacts.**
  Produced figures and narratives that separate **“start of epidemic”** vs **“capacity-breach jump”** and quantify how much κ (testing/isolation throughput) delays the jump before it fails.

## Key results (figures)

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/epidamic_schemetic.png" title="SEIRQ with finite isolation throughput" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/epidamic_simu_result.png" title="Final infected fraction vs β at different κ" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

- **Left:** Model schematic with two infection channels (to E and I), re-susceptibility \(f_1,f_2\), and isolation limited by κ.
- **Right:** As κ decreases, curves exhibit a **sharp upturn** once β crosses the analytically predicted boundary—evidence of a **discontinuous transition** under limited testing/isolation.

## Why it matters

- **Explains “it works… until it doesn’t.”** Even aggressive test-trace-isolate regimes can keep \(R_0\) near 1 yet still suffer a **sudden failure** after throughput is exceeded.
- **Gives actionable levers.** The thresholds quantify how much κ (or contact reduction) you need to **avoid the jump**, and how density/lockdown rules reshape risk windows.

## Repro/notes

- ODE: SEIRQ with parameters \(\beta,\tau,\gamma,\gamma_1,\delta,f,f_1,f_2,\kappa\); jump predicted from the \(I=\kappa\) manifold and steady-state \(I^\*(\beta)\) equality.
- CA: N×N grid, 4-neighborhood contact + random long-range trials scaled by density; community blocks of size \(N\_{\text{comm}}\) auto-isolate when positives exceed a set fraction.
- Additional context and write-up structure are summarized in the final report and page draft.
