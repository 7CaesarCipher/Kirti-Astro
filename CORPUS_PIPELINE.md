# Kirti Astro — Corpus Collector & Chat Studio v0.2
Runnable local frontend + Python backend + source collection scripts, bundled with four historical astrology texts (360,485 words; 2,542 candidate passages).

## Start on Windows
Install Python 3.11 or newer, extract this folder, open PowerShell inside it:
```powershell
python server.py
```
Open http://127.0.0.1:8000 . No pip dependencies or API key required. `start.ps1` is an alternative launcher.

## macOS / Linux
```bash
python3 server.py
```
Alternative Docker startup: `docker compose up --build`. Open the same URL. Docker must be installed; container build requires internet. Port 8000 can be changed using the PORT environment variable for native execution (also change Compose mapping if using Docker).

## What the UI does
Chat-style research interface; select one source/tradition, ask questions, inspect the complete parent passage and provenance, record reviewer name and note, and approve passages. Research mode is on by default and clearly labeled. Turn it off for approved-only retrieval; initially no passages are approved. Chats display in the browser for the current page session only; questions are independent, not conversational-memory-aware. Birth charts and user birth profiles are not implemented.

## Backend
- GET /api/health
- GET /api/status
- GET /api/context?id=CHUNK_ID
- POST /api/chat: {"question":"wealth","source":"brihat_jataka","research":true}
- POST /api/review: {"chunk_id":"...","reviewer":"...","note":"..."}

The local development server binds to 127.0.0.1. Docker publishes only on loopback. This is a single-user local tool, not a production multi-user server. Add authentication, authorization, transactional review storage, rate limiting, TLS, hardened serving and user isolation before internet deployment. Review names are self-reported, not authenticated identities.

## Corpus collection and processing
All eight downloaded source assets are bundled under corpus/raw. `sources.json` contains their exact download URLs and rights metadata.
```bash
python scripts/01_collect.py
python scripts/01_collect.py --force
python scripts/02_build.py
python scripts/03_validate.py
python scripts/04_search.py "wealth" --source brihat_jataka --research
python pipeline.py context brihat_jataka-u00153-w00000
python scripts/05_review.py CHUNK_ID --reviewer "Your name" --note "Reviewed original context, extraction and permitted use"
python scripts/06_export.py
```
Collect uses cached files unless --force is set. Fresh downloads validate format and size, use temporary files, retain exact downloaded bytes and record SHA-256 hashes. Downloads fail visibly on network errors; rerun to resume through already cached files. Hashes are provenance records, not signatures authenticating the publisher. A force refresh may change source bytes. Rebuild afterward and re-review affected passages.

Build separates the original files, normalized parent units and retrieval windows; Indian XML is page-indexed, Gutenberg text paragraph-indexed. These locators are not fabricated printed-page citations. Build scripts currently have explicit parsers for these FOUR sources. Adding a source requires adding a compatible parser/metadata entry in corpus/scripts/build.py as well as a downloads entry in sources.json. This is not a universal arbitrary-PDF importer.

Review approvals bind to the exact SHA-256 of the passage text. Changed text will not pass approved-only retrieval even if its chunk ID stays the same. Human reviewers must also inspect parent context and source version; source/context changes can require revocation beyond this minimum automatic check. Delete a review entry in reviews.json to revoke it. Approved export remains empty until real review is performed. The audit.jsonl file is an append-only-by-convention local log, not tamper-proof storage.

## Optional local LLM
Install and run Ollama separately. Pull a chat model suitable for your hardware, then set its installed name:
```powershell
$env:OLLAMA_URL="http://localhost:11434"
$env:OLLAMA_MODEL="YOUR_INSTALLED_CHAT_MODEL"
python server.py
```
On macOS/Linux use `export OLLAMA_MODEL=YOUR_INSTALLED_CHAT_MODEL` before starting. Docker uses host.docker.internal by default. The backend passes retrieved parent passages to Ollama. Without a configured model, or if Ollama is unavailable, it returns evidence only. Model answers are labeled unverified drafts: no automatic semantic citation-verification guarantee is provided.

## Optional embedding export
After approving passages and installing an embedding model in Ollama:
```bash
python scripts/07_embed.py --model YOUR_INSTALLED_EMBEDDING_MODEL
```
Exports approved passages and model-tagged vectors under exports/. The current chat search uses SQLite FTS5 keyword ranking. It does NOT yet use these vectors, pgvector, hybrid retrieval or a reranker. They are integration-ready exports, not a claim of a deployed vector RAG system.

## Validate
```bash
python -m unittest discover -s tests -v
```
Tests cover corpus/index integrity, source filtering, parent retrieval, review/hash enforcement and a real HTTP chat request. Live Ollama generation, fresh external downloads, Docker startup and visual browser layout are separate integration checks and are not certified by these tests.

## Coverage and rights
Read corpus/README.md and sources.json before reuse. Sources: Brihat Jataka (1905), Brihat Samhita (1884–1885 composite scan), Sepharial (1920), Tetrabiblos (1900 edition). Preserve included Gutenberg credits/license. Public-domain status is host-reported and jurisdiction-specific, not worldwide clearance.

No synthetic horoscope material or private birth details are included. OCR, table extraction, chapter boundaries and historical claims need review. The collection is not universal coverage of astrology. Chart calculations, ephemerides, dashas, user accounts, trained models and scientifically validated personal predictions are not part of this release. Astrology references are historical/traditional material, not scientific evidence or medical/financial advice.
