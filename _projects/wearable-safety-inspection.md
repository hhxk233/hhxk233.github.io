---
layout: page
title: Wearable Safety Inspection with Multimodal LLMs
description: SJTU team capstone combining Rokid AR glasses and compact vision-language models for industrial safety inspection, sponsored by Prof. Yifei Zhu.
img: assets/img/wearable-safety-architecture.png
importance: 1
category: ML
giscus_comments: false
---

<blockquote>
  <p>
    <strong>Bachelor's capstone thesis, Shanghai Jiao Tong University, August 2026.</strong><br>
    <em>Multimodal-Large-Language-Model-Driven Wearable Manufacturing Safety Inspection System</em><br>
    <strong>Team:</strong> Yutong Wu, Mengru Wang, Yiyang Wang, Lidi Wang, and <strong>Yuheng Wang</strong>.<br>
    <strong>Supervisor:</strong> Prof. Qianli Chen, Global College (formerly UM-SJTU Joint Institute).<br>
    <strong>Sponsor:</strong> Prof. Yifei Zhu.
  </p>
</blockquote>

Our team built a wearable inspection prototype that captures first-person images, identifies potential hazards, and returns the violated rules with a short explanation. The project covers construction sites, oil-and-gas pipelines, and chemical laboratories, combining compact vision-language models with an AR interface.

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% include figure.liquid loading="eager" path="assets/img/wearable-safety-architecture.png" alt="Wearable inspection workflow from AR image capture through compression and model inference to visual and audio feedback" title="Wearable inspection system architecture" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">System concept: sampled images from the glasses are compressed, analyzed by a domain-adapted model, and returned as visual or audible feedback. Thesis Fig. 3-2.</div>

## What we built

- **Domain-adapted safety models.** Compared zero-shot inference, LoRA fine-tuning, and image-case retrieval-augmented generation across three safety tasks. Oversampling unsafe construction examples helped recover violation recall under severe class imbalance.
- **Image-case retrieval.** Used SigLIP2 embeddings and ChromaDB to retrieve annotated training examples, with a similarity gate and query-focused prompting. Retrieval can be disabled when response time takes priority.
- **Wearable-to-server pipeline.** Connected a Rokid capture application, an Aliyun control service, and a GPU inference backend. Structured responses carry the hazard, rule, and reason; a busy-rejection policy prevents outdated frames from accumulating in a queue.
- **Two operating modes.** Implemented accuracy-first and latency-first presets with configurable image resolution, JPEG quality, prompts, and generation budgets, alongside response-time and battery telemetry.

## Key results

The thesis reports the following held-out results. These are separate task metrics, rather than a single system-wide accuracy score.

<div class="table-responsive" markdown="1">

| Task                                 | Fine-tuned model | Evaluation set       | Result                       |
| ------------------------------------ | ---------------- | -------------------- | ---------------------------- |
| Construction-rule violations         | Gemma3-4B, v2    | 3,004 real images    | **55.9% micro-F1**           |
| Pipeline safety-level classification | Qwen2.5-VL-3B    | 245 real images      | **92.1% micro-F1**           |
| Laboratory hazard detection          | Qwen2.5-VL-3B    | 164 synthetic images | **96.8% hazardous-class F1** |

</div>
<div class="caption">Reported benchmark results from thesis Tables 6-1 to 6-3. Laboratory results measure performance on the synthetic LabSafety-v1 distribution.</div>

## System validation

The integrated prototype used Gemma3-4B for stable structured output. In a controlled bench evaluation with 100 examples per scenario, switching from accuracy-first to latency-first reduced capture-to-response time from **8.189 to 1.144 seconds** for construction scenes and from **10.905 to 1.520 seconds** for laboratory scenes. The faster mode produced less complete explanations; laboratory hazard recall also decreased.

<div class="row justify-content-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/wearable-safety-bench-setup.png" alt="Controlled bench setup in which AR glasses capture dataset images displayed on a laptop and exchange requests with the inference server" title="Controlled bench evaluation setup" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">Controlled bench evaluation using predefined images displayed on a laptop. The timing runs from capture start to receipt of the server response at the glasses. Thesis Fig. 6-2 and Table 6-7.</div>

## Notes

- **Prototype scope.** The glasses-to-backend loop was tested on the bench. Extended inspection sessions in real workplaces remain future work.
- **Dataset limitations.** Rare construction rules and pipeline categories remain difficult. The synthetic laboratory results require validation on real camera images.
- **Next steps.** Scene-level evaluation splits, more diverse hazard examples, and temporal aggregation would help assess generalization and reduce repeated alerts.
