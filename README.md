# GROKER

A website inspector with five walking characters and an evidence-based report. Code collects and checks public HTML, links and resources. An optional Grok model call writes the final summary. No hosted Grok Bots are created or controlled.

## Deployment on Vercel

Deploy **this `groker` directory**, not the parent `assay` repository root.

In the Vercel project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `groker` if importing the parent repository; `.` if the repository contains this folder's contents |
| Framework Preset | Other |
| Build Command | Leave unset; `vercel.json` disables the build step |
| Install Command | Leave unset; no third-party runtime dependencies |
| Output Directory | `public`, set in `vercel.json` |
| Python | 3.12, pinned in `.python-version` |

`api/index.py` is the one Python function. `vercel.json` includes its engine files, sets a 60-second maximum duration and maps `/crew`, `/guide`, `/runs` and individual run routes to the frontend. Static files come from `public/`. Source files, local fixtures and saved test data are not served as website assets.

The same deployment model as the REAGENT desk is used:

1. The browser sends `POST /api/index` with `{"action":"inspect","url":"https://example.com/"}`.
2. That invocation gathers evidence, verifies missing responses and returns the complete report. The function does not launch background jobs or write reports to disk.
3. Meanwhile, the browser animates the room. Its activity bar is explicitly estimated; it is not backend telemetry and never reaches 100% before a result arrives.
4. The browser saves the last 20 completed reports in localStorage, trimming older reports if it hits the storage quota. JSON export provides a separate copy.

There is no database or queue to configure. Run URLs are **browser-local bookmarks**, not public share links. History does not sync between devices, browsers or origins. Clearing site storage removes it. If storage is unavailable, the current report remains visible and the app asks the user to export it.

Keep the page open until the response arrives. Refreshing, navigating away or pressing **Stop waiting** discards the in-flight result. Disconnecting the browser does not guarantee cancellation of the function; its work remains bounded.

The evidence collection budget is 38 seconds. Individual network requests and redirects also have timeouts. When the budget is reached, unrequested destinations are marked unavailable and excluded from the score; the report says that coverage was limited. The optional model call has a separate 10-second budget and falls back to the code-generated summary on failure. A per-instance semaphore prevents more than two simultaneous inspections inside one Python process; this is not a deployment-wide rate limiter.

The deployment has not been published automatically. Local tests exercise the Vercel entrypoint and read-only operation; an actual Vercel deployment is the final check of the platform environment.

## Optional Grok summary

Add these variables under the Vercel project's Environment Variables, then redeploy:

```text
GROKER_XAI_API_KEY=your-key
GROKER_XAI_MODEL=your-enabled-model-id
```

Neither variable is required for scanning or rich reports. The key stays on the server. Demo runs never call a model. Only collected inspection evidence is sent to `api.x.ai`; website text is treated as untrusted source material.

## Local preview

Requires Python 3.10 or newer, with no packages to install:

```powershell
cd D:\vibecoding\assay\groker
python server.py --port 5174
```

Open http://127.0.0.1:5174. The local preview and the Vercel function call the same engine and endpoint logic. Old files under `data/` are not part of browser history and are not uploaded.

## Inspection scope

Up to 8 public HTML pages, 28 same-origin links and 16 resources. Checks cover HTTP responses, missing resources, titles, descriptions, language, viewport metadata, heading structure, image alt attributes and observed delivery details. Missing pages/resources are requested again. Private/local destinations and redirects into private networks are rejected; TLS verification stays enabled.

The report includes an explained sample-health grade, main finding, page graph, weighted checks, per-page notebooks, response headers, resource inventory, prioritized fixes, agent notes and evidence receipts. Unknown checks are excluded. Confirmed missing pages/resources cap the score at 74 (C); the complete scoring method is visible in the report.

This version does not render JavaScript, take screenshots, submit forms, log in, test Core Web Vitals, audit security or certify accessibility. The labelled demo inspects fixture HTML through the same pipeline.

## Verification

```powershell
python -m unittest discover -s tests -v
node --test tests/archive.test.cjs
node --check public/app.js
node --check public/room.js
node --check public/report.js
```

Three.js is bundled with its MIT license in `public/vendor/`. The room and characters are authored locally. Baloo 2 and Manrope fonts are bundled with their SIL Open Font Licenses in `public/fonts/`.
