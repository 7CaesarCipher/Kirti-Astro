# Traditional timing analysis

Version: editorial-screen-v1. This is a transparent experimental screen, not a complete classical rule system, an expert-reviewed reading or a scientifically validated prediction. No probability, favorable rating, precise wedding date, wealth amount, or investment recommendation is produced.

## Inputs and caching

The engine reuses the computed Lahiri sidereal birth charts and Vimshottari timeline. Once per birth session it computes Jupiter/Saturn transits at the generation timestamp and the first day of each subsequent month, for five 365.25-day years. All timestamps and displayed dates are UTC. Chat reuses this session snapshot; no natal recalculation is needed. Generate a new session to refresh the analysis date.

## Explicit editorial rules

| Topic | Natal factors used for dasha relevance | Supplementary chart |
|---|---|---|
| Marriage | Seventh-house rulers and occupants, plus Venus as a relationship indicator | D9 seventh-house rulers and occupants |
| Money and wealth | Second- and eleventh-house rulers and occupants | D2 second- and eleventh-house rulers and occupants under the app's Cancer/Leo convention |
| Career | Tenth-house rulers and occupants | D10 tenth-house rulers and occupants |

These factor choices, their OR combination and the five-year horizon are editorial design choices. In particular, supplementary D2 house use is an experimental convention, not a universally agreed wealth rule. The rule does not label every relevant planet as beneficial.

A Mahadasha/Antardasha interval is a candidate when either lord appears in the topic's factor list. Clip it to the analysis horizon. List reasons separately for each lord. Windows are chronological and unranked; chat shows the first five and reports when more exist. An empty result means no match under these rules, not that marriage, money or career progress is impossible.

Within each candidate, inspect the monthly samples for Jupiter or Saturn occupying or casting a selected whole-sign aspect onto the relevant D1 house signs. Counting the planet's own sign as zero, Jupiter uses offsets 0/4/6/8 and Saturn 0/2/6/9. Zero denotes occupation, not an aspect. These are sign-level contacts: degree orbs and exact ingresses are not computed. Output records the sampled date, longitude, source sign and contacted natal signs. Transit matches are descriptive context and do not turn a candidate into a guaranteed event. Candidates without matches remain explicitly labelled dasha-only.

## Limits

Monthly samples can miss contacts between samples and do not establish continuous overlap. Dasha endpoints are half-open interval boundaries, not event dates. Full yogas, planetary strength, afflictions, complete transit analysis, real-world relationship/financial circumstances and birth-time rectification are not assessed. D1 and supplementary ascendant sensitivity is flagged using the existing ±1-minute samples; planetary boundary sensitivity is not exhaustively assessed. No source passages are automatically approved or used as evidence for these editorial algorithms.

## General questions

Suggested questions are available when chat opens: marriage timing, wealth periods, career timing, learning, Moon placement and retrograde. Basic mode routes recognized questions directly, supports several topics together, explains selected-chart houses and identifies unsupported questions. It is not a general language model. When configured, local Ollama receives the calculated factors and candidates and is instructed to explain only those supplied dates and rules. Its factual compliance still needs evaluation.

## Background sources

Traditional house, divisional and dasha concepts were consulted in [Brihat Parashara Hora Shastra](https://vedic-astro.s3.amazonaws.com/books/bhrihat_parasara_hora_shastra.pdf). This supplies historical context, not validation of the editorial screening algorithm. Astronomical computation uses the [Swiss Ephemeris API](https://www.astro.com/swisseph/swephprg.htm). These web references have not been added to or approved within the application's historical corpus.

## Verification

Tests check candidate bounds, half-open dates, monthly schedules across years, sign-aspect matching, reasons, cache reuse, no-match behavior, selected-chart facts and multi-topic routing. They do not provide an independent ephemeris comparison or validate outcomes against actual marriages or financial histories. Human rule review and outcome evaluation remain outstanding.
