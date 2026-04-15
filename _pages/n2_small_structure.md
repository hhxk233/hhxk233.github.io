---
layout: page
title: N2 Small Structure
permalink: /n2_small_structure/
nav: false
---

<p>
  Interactive spectrum for the N2 small-structure peaks.
  Use scroll to zoom, drag to pan, and click markers to inspect peaks.
</p>

<p style="margin-top: 0.25rem; color: #555;">
  <strong>Note:</strong> This page is prepared for Umich Physics 441 Atomic and Molecular Spec,
  and is intended to host supplementary analysis/plots that do not fit in the report.
</p>

<div style="width: min(1500px, 96vw); margin-left: 50%; transform: translateX(-50%);">
  <iframe
    src="{{ '/assets/html/n2_small_structure_interactive.html' | relative_url }}"
    title="N2 small-structure interactive spectrum"
    width="100%"
    height="760"
    style="border: 1px solid #ccc; border-radius: 8px; background: #fff;"
    loading="lazy"
  ></iframe>
</div>
