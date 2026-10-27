# GROKER

A separate website-inspection product. Five full-body bots walk through a shared Three.js studio, carrying notebooks and stopping at workstations in both idle and inspection modes. Floating labels describe their current actions. The cream, lilac and coral palette and Baloo 2 / Manrope typography follow the supplied Musecrew reference.

## Run locally

Requires Python 3.10 or newer. There are no Python runtime dependencies.

```powershell
cd D:\vibecoding\assay\groker
python server.py --port 5173
```

Open http://127.0.0.1:5173.

- **Workbench:** studio workspace with a desktop sidebar, a compact mission composer, a full-width room, crew selectors and a mission strip below the room.
- **Reports:** explained sample-health grade, a prominent verdict and main catch, an interactive page graph, weighted check breakdowns, per-page notebooks, response headers, resource inventory, prioritized fixes, crew notes and source receipts. Metrics and the grade are part of the notebook cover, rather than a separate side rail.
- **Runs:** persisted local run history, search, demo/live filters and individual run pages.
- **The crew:** character profiles and responsibilities.
- **Field guide:** workflow, supported checks, explicit limitations and model configuration.

The demo inspects a small fixture website through the same analysis pipeline. It is explicitly labelled and never passed off as a live inspection.

## Current inspection scope

Up to 8 public HTML pages, 28 same-origin links and 16 resources. Checks cover HTTP responses, missing resources, HTML title/description/language/viewport metadata and image alt attributes. Missing pages and resources are requested again. Results are saved in `data/`, which is excluded from version control.

Private/local destinations are rejected, including redirects. The fetcher validates public DNS addresses and connects to a validated IP, retaining the original hostname for TLS validation. Requests are bounded and there are only two simultaneous inspections. The UI server binds to loopback and is intended as a local application; add authentication, per-user storage, a durable job queue and deployment-level request limits before public hosting.

This version does **not** run browser-layout checks, produce website screenshots, submit forms, log into websites or scan security vulnerabilities. The room is the visualization; no hosted Grok Bots are controlled.

## Optional final summary through Grok's model API

Without configuration, Chief generates a deterministic summary of collected evidence. To use a model for the final paragraph, set these environment variables before launching:

```powershell
$env:GROKER_XAI_API_KEY = 'your-key'
$env:GROKER_XAI_MODEL = 'your-enabled-model-id'
python server.py
```

Only collected public inspection evidence is sent to `api.x.ai`. Scanning, checks and verification remain code-driven. If the optional request fails, the evidence summary remains available. Demo runs do not call a model.

## Verification

```powershell
python -m unittest discover -s tests -v
node --check public/app.js
node --check public/room.js
```

Three.js is served locally with its original MIT license in `public/vendor/`. Character geometry and the studio scene are authored locally. Baloo 2 and Manrope are served from `public/fonts/` with their SIL Open Font Licenses; font loading does not require an external font service.

The report grade is a transparent heuristic for the collected sample. Unknown checks are excluded. Repeated missing routes/resources cap the grade at C; passed metadata checks cannot hide those failures. The scoring rules, thresholds, weights and exclusions are visible in each report. Missing call-to-action destinations are prioritized using the actual anchor text and referring page.
