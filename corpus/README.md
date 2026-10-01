# Kirti Astro — source-curated research corpus v0.1
Collected 29 September 2026. Four real historical texts, not AI-written astrology content.

## What is included
- Brihat Jataka, Varahamihira, translated by N. Chidambaram Aiyar, 1905 edition: Indian natal astrology.
- Brihat Samhita, Varahamihira, translated by N. Chidambaram Iyer, 1884–1885 composite scan: Indian samhita material, including substantial non-natal historical content and an appendix.
- Astrology: How to Make and Read Your Own Horoscope, Sepharial, transcription of 1920 edition: historical Western astrology.
- Tetrabiblos, Ptolemy, J. M. Ashmand translation, Gutenberg catalogue identifies 1900 edition: Hellenistic astrology plus editorial/appendix material.

## Files
- raw/: original downloaded texts, page-structured OCR XML, and Internet Archive metadata. Gutenberg files retain their complete license and credits.
- clean/: minimally normalized JSONL, with traceable scan-page or transcription-paragraph identifiers.
- chunks.jsonl: candidate retrieval windows, parent links, tradition, provenance, review flags. Parent units retain full context; do not use windows without parent context.
- metadata/sources.json: edition, source URL, rights-evidence URL, hash, extraction type and review state.
- metadata/quality_report.json: measured counts.
- research_index.sqlite: runnable SQLite FTS5 keyword index, not a vector index.
- scripts/build.py: deterministic offline rebuild from included originals; Python standard library only.
- scripts/search.py: research search with source filtering.

## Run
```bash
python scripts/search.py 'wealth' --source brihat_jataka --limit 3
python scripts/search.py 'marriage' --source tetrabiblos --limit 3
python scripts/build.py
```
FTS query syntax is accepted. No API keys, embeddings or language model are required for this research index.

## Review and usage boundaries
This is source-curated, not expert-certified interpretation data. ALL passages have production_approved=false. The supplied search script deliberately searches candidate passages for reviewers; it is not a production eligibility filter. Do not expose this research index directly to a consumer chat application. Build a separate reviewed allowlist/index before deployment.
Indian sources are OCR and have not been checked page by page against scans. No spelling, missing signs, formula values or table relationships were silently repaired. Scan page numbers identify XML objects in this download and are NOT printed book page numbers. Paragraph locators refer to this exact Gutenberg transcription. Chapter/verse boundaries and context exceptions are not fully parsed. Very short passages, front matter, indexes, repeated headers and editorial material remain in the research collection and need classification. Chunk quality flags are advisory, not an exhaustive safety filter.
Historical material includes unsupported claims about health, lifespan, sex, caste, disability and character. Preserve it as historical evidence; do not turn it into diagnoses, financial recommendations, discrimination or factual predictions about a person. Prompt injection in any future ingested source must be treated as untrusted text.

## Rights
Rights statements are host-reported evidence, not worldwide legal clearance. Brihat Jataka's Commons tag establishes USA status but does not establish source-country status in that page. Brihat Samhita carries Public Domain Mark / PD-old-100-expired on its host page. Gutenberg lists both books as public domain in the USA and retains its distribution terms in the original files. Review jurisdiction and distribution obligations before commercial deployment, especially outside the USA. Do not assign one blanket license to this collection. Application and utility scripts in this release are AGPL-3.0-or-later; underlying sources retain their respective rights/terms.

## Missing coverage (not downloaded or claimed supported)
- BPHS, Saravali, Phaladeepika and comprehensive modern Vedic commentaries: edition-specific rights and reliable extraction still needed.
- Complete verified D1–D60 rules, Shadbala, Ashtakavarga, and dasha calculation specifications: not supplied as validated executable rules.
- KP, Jaimini, Chinese astrology, modern Western systems and multilingual originals: not comprehensive or separately sourced here.
- No embeddings, LLM fine-tuning, deployed chat app, expert-approved rules, chart engine, or private birth profiles are included.

## Next ingestion stage
Select the tradition, retrieve only matching sources, expand candidate windows to parent context, have reviewers approve precise passages and their conditions, add reviewed evaluation questions, then create versioned embeddings. Keep natal calculations outside the LLM and cite exact sources. Add new sources only after recording edition, access, rights and checksum. No user birth data belongs in this shared corpus.
