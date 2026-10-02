# Kirti Astro — Birth Form, Charts & Reading (v0.3)

A simple UI: **Name → date of birth → time of birth → birthplace → Generate my reading**.
Results show D1, D9 and D10, all 17 supported divisional charts in an expandable section, including D81 Nava-Navamsa (Navamsa mapping applied twice), planetary placements, Moon nakshatra/pada, current Vimshottari Mahadasha/Antardasha, a basic symbolic reading and follow-up chat using the same profile. Source selection and review controls are not on the user screen.

## Windows / Docker (recommended)

Extract this project into a NEW folder so you can keep your previous version and reviews. In PowerShell inside the extracted project folder:

```powershell
docker compose up -d --build
```

Open **http://127.0.0.1:8085**. Stop the previous project's container first if it already uses 8085, or change only the left-hand port in compose.yaml. No local Python installation is needed with Docker.

## Native Python alternative

Python 3.11 or newer is required:

```powershell
py -3 -m pip install -r requirements.txt
py -3 server.py
```

Open http://127.0.0.1:8000 for native execution. macOS/Linux can use python3 instead of py -3. If pip builds Swiss Ephemeris from source, a C/C++ build toolchain is required; Docker already installs one.

## Use

1. Enter name (optional), date and recorded time.
2. Enter birthplace and click Find place. Select the correct match.
3. Click Generate my reading.
4. Explore results and ask follow-ups. New reading deletes the server-side session.
   Place search uses Open-Meteo/GeoNames, with provider attribution in results. A sourced Colonelganj, Prayagraj locality is bundled for offline use: search `Colonelganj Prayagraj`. Other places require internet. No coordinates are guessed on lookup failure. Location requests contain the search term, not DOB/name/time. Location precision is city/locality, not a birth hospital.

## Calculation conventions

Swiss Ephemeris 2.10.3.2, explicitly selected Moshier analytical ephemeris (no external .se1 files), Lahiri sidereal zodiac, mean nodes, whole-sign houses. D2 uses Cancer/Leo horas; D30 uses unequal Parashari segments; D60 counts from natal sign. Other divisional conventions may disagree with other software.
Birth timezone comes from the place result and zoneinfo historical offsets. Nonexistent/ambiguous DST times are rejected, not silently chosen. This release supports birth years 1900–2100 (not future births) and latitudes strictly between ±66°. Polar and ambiguous DST inputs need specialist handling not implemented here.
Time is entered to the minute. Ascendant sensitivity is sampled at -60, -30, 0, +30, +60 seconds. It flags changes but is not exhaustive boundary analysis or time rectification. Larger time uncertainty and location uncertainty require more assessment. Planetary placements can also be sensitive and this release does not exhaustively detect every planetary varga boundary.
Vimshottari uses a 365.25-day year and current server UTC timestamp. Displayed period dates are UTC dates. Check against an independent chart package with identical settings before relying on the calculation. Included regression fixtures use prior same-engine calculations, not independent astronomical validation.

## Answers and RAG

Without OLLAMA_MODEL, the backend returns a deterministic basic reading built from calculated house lordships, topic labels and dashas. It does not present book passages as verified support for unreviewed interpretations. Topic labels are editorial summaries of traditional concepts, not expert-approved rules.
All four real source texts and corpus collection/rebuild/review scripts remain included. Only unchanged passages explicitly approved through the CLI review workflow enter consumer chat retrieval. Initially none are approved. The original research search remains available via pipeline.py, not as a user-facing control.
With Ollama enabled, the model receives computed chart facts, the recent session conversation and any approved matching Indian natal-source passages. Model output is a draft; there is no independent semantic fact/citation verifier. It is not guaranteed to follow every instruction. All rendering uses textContent to avoid executing generated HTML.

### Enable Ollama (optional)

Install/run Ollama on your host and pull a model suitable for your hardware. In a `.env` file alongside compose.yaml:

```text
OLLAMA_MODEL=YOUR_INSTALLED_CHAT_MODEL
OLLAMA_URL=http://host.docker.internal:11434
```

Then run `docker compose up -d --force-recreate`. No cloud API key is needed. Model weights require a separate download and are not included. If the model is unavailable, the app returns its basic reading. Native execution uses http://localhost:11434 by default.

## Corpus scripts

See CORPUS_PIPELINE.md for the previous research pipeline documentation (its description of the old main UI is historical). Current scripts:

```powershell
docker compose exec astro python scripts/01_collect.py
docker compose exec astro python scripts/02_build.py
docker compose exec astro python scripts/03_validate.py
docker compose exec astro python scripts/04_search.py wealth --source brihat_jataka --research
docker compose exec astro python pipeline.py context CHUNK_ID
docker compose exec astro python scripts/05_review.py CHUNK_ID --reviewer "Your name" --note "Review details"
docker compose exec astro python scripts/06_export.py
```

Embeddings can still be exported but the active retrieval uses SQLite FTS5, not hybrid/vector search. Source downloads/parser definitions currently cover four books, not arbitrary uploaded PDFs.

## Privacy / deployment scope

Single-user localhost development application. Server sessions are memory-only, scoped by random bearer tokens, expire after one hour of inactivity and disappear after a restart. The browser token stays in page memory, not localStorage. Opening a new tab cannot retrieve another tab's chart without its token. Birth profiles are not written to audit files or corpus storage. Approved-reference review records and corpus metadata remain on disk. No authentication, TLS, multi-user account management or production-grade rate limiting is implemented; do not expose the server publicly as-is.
No birth-chart engine is connected to the retained research_server.py; start server.py for the new application. The older research endpoint module exists for backward tests only.

## Tests

```powershell
docker compose exec astro python -m unittest discover -s tests -v
```

Tests cover corpus integrity, source isolation, approval hash checking, representative chart/varga boundaries, time-zone ambiguity, actual HTTP form-to-chart and chat flow, token isolation and deletion. The test suite expects no OLLAMA_MODEL configured. Live LLM quality and Docker execution need verification in your environment.

## Licensing and limits

Swiss Ephemeris/pyswisseph uses AGPL licensing with a separate professional licensing option from Astrodienst. This project's application code is supplied under AGPL-3.0-or-later; see LICENSE. Do not assume that a closed-source hosted deployment is permitted without addressing those obligations. Underlying books retain their own rights and Gutenberg distribution terms; see corpus/README.md and sources.json. Location data: Open-Meteo/GeoNames attribution, https://open-meteo.com/en/docs/geocoding-api ; bundled locality: https://mapcarta.com/14893376 .

Astrology is traditional interpretation, not scientifically validated prediction. No event guarantees, complete transit interpretation, medical diagnosis, investment recommendation or full universal astrology coverage is claimed.

## Verification for this package

Eight automated backend/integration tests passed. Live Prayagraj lookup was checked. Browser rendering could not be verified in the build environment because Chromium socket creation was blocked. Docker build and live Ollama output were not exercised here.

A jsdom DOM test against a live local HTTP server also passed: form, place selection, main charts, planetary table, D60 selection, follow-up and reset. This checks interaction behavior, not pixel layout.

## Chart division guide

See [KUNDALI_GUIDE.md](KUNDALI_GUIDE.md) for all 17 supported charts, the 47.5° example, subdivision rules and the calculation-to-LLM flow. Each displayed chart includes expandable per-planet mapping explanations. Ollama follow-up context includes all calculated divisional placements.

Choosing any chart updates Your reading with that chart’s ascendant and planetary houses. Follow-up chat and language changes use the selected chart. Rapid selection changes discard older reading responses. Without Ollama, divisional readings list calculated placements and basic symbolic house themes.

Keep exploring opens chat for the existing calculated chart. There is no question-count limit; each request reuses the session chart and extends its one-hour inactivity expiry. The model receives a bounded recent conversation, so unlimited questions does not mean unlimited model memory. New reading or a server restart ends the session.

## Marriage, wealth and career timing

Keep exploring includes suggested questions for marriage timing, money/wealth, career timing and general placements. [TIMING_ANALYSIS.md](TIMING_ANALYSIS.md) describes the editorial rules and their limits. Each new birth session computes natal charts once and caches five years of timing candidates, with monthly Jupiter/Saturn samples. Follow-ups reuse those results. Basic mode recognizes multiple topics, Hindi marriage/money keywords, and specific planets; unsupported questions are identified instead of receiving an unrelated overview. Local Ollama remains optional for broader wording and explanations.

Current verification: 11 backend/integration tests passed, including date bounds, monthly aspect matching, cached timing reuse and question routing. These are implementation checks, not independent astronomical or predictive validation. Browser rendering and live model output have not been verified for this change.

## Bilingual chat

Inside Keep exploring → Open chart chat, choose English, हिन्दी or Both / दोनों. Replies keep their original English text and cache the Hindi version in browser memory. Changing the chat dropdown translates existing replies rather than rerunning their interpretation or natal calculations. The chat selector is independent of the page-language selector. Question text stays as entered.

Translation uses the configured local Ollama model; no new cloud service is added. Missing/unavailable models, incomplete Hindi, or changed numeric/planet/sign tokens cause an explicit English fallback. These token checks do not verify semantic equivalence. A live test exposed poor Hindi wording from qwen2.5:3b. Protected names and numeric checks reduce factual changes but do not validate Hindi quality; longer outputs and browser behavior still need review. Native example: `OLLAMA_MODEL=qwen2.5:3b PORT=8001 python server.py`.

Hindi replies now use deterministic summaries of stored chart calculations. They are labelled as summaries, not word-for-word translations. Unsupported free-text translations retain the original text with a notice. No unchecked Hindi model drafts are streamed. Set `OLLAMA_MODEL=qwen2.5:3b` for optional concise English answers; the translation-model environment variable is no longer used.

Chat uses the stored chart, timing analysis and assessment; switching language or asking another question does not recalculate the birth chart. Marriage replies receive D1 and D9 placements and retain the topic for follow-up questions.

The assessment panel includes all six Shadbala categories, BAV/SAV, reductions, Shodhya Pindas and D1 checks for the 284-rule pinned yoga catalogue. Local corpus research excerpts retain source IDs and locators. Unreviewed excerpts are explicitly labelled and do not become approved interpretation evidence. See [ASSESSMENT.md](ASSESSMENT.md) for methods and limitations.
