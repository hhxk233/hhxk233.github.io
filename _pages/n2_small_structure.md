---
layout: page
title: N2 Small Structure
permalink: /n2_small_structure/
nav: false
---

<p>
  Interactive spectrum for the N2 small-structure peaks.
  Use scroll to zoom, drag to pan in any direction, and click markers to inspect peaks.
</p>

<p style="margin-top: 0.25rem; color: #555;">
  <strong>Note:</strong> This page is prepared for Umich Physics 441 Atomic and Molecular Spec,
  and is intended to host supplementary analysis/plots that do not fit in the report.
</p>

<div style="width: min(1500px, 96vw); margin: 0 auto;">
  <iframe
    id="n2-small-structure-frame"
    src="{{ '/assets/html/n2_small_structure_interactive.html' | relative_url }}"
    title="N2 small-structure interactive spectrum"
    width="100%"
    height="940"
    style="display: block; border: 1px solid #ccc; border-radius: 8px; background: #fff;"
    loading="lazy"
  ></iframe>
</div>

<script>
  (() => {
    const frame = document.getElementById("n2-small-structure-frame");
    if (!frame) return;

    const syncHeight = () => {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const nextHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
      if (nextHeight) frame.style.height = `${nextHeight + 24}px`;
    };

    frame.addEventListener("load", () => {
      syncHeight();
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc || !("ResizeObserver" in window)) return;
      const observer = new ResizeObserver(syncHeight);
      observer.observe(doc.body);
      observer.observe(doc.documentElement);
    });

    window.addEventListener("resize", syncHeight);
  })();
</script>
