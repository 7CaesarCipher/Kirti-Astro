# Kundali and divisional charts

A zodiac circle is 360°, containing 12 signs of 30° each. Planets do not each span 30°: each has a calculated longitude. Aries starts at 0°, Taurus at 30°, Gemini at 60°, continuing through Pisces at 330°.

For longitude L: normalize L modulo 360, sign index = floor(L/30), and degree within sign = L modulo 30. Thus 47.5° = Taurus 17°30′. These are sidereal longitudes in this app, using Lahiri ayanamsa.

For most Dn charts, part width = 30°/n and zero-based part index = floor(degree × n / 30). The part is then assigned to a sign using that chart's mapping rule. Simply multiplying all longitudes by n does not implement every chart. Boundaries include the start and exclude the end. D30 here uses unequal segments.

Example: Taurus 17°30′ in D9 has width 3°20′ and falls in part 6, between 16°40′ and 20°. Taurus is fixed, so its Navamsa sequence starts at Capricorn: Capricorn, Aquarius, Pisces, Aries, Taurus, Gemini. The result is Gemini. D10 uses 3° parts; the same position is in part 6. Taurus is even, so counting starts at Capricorn and also gives Gemini. Other positions generally give different results across charts.

| Chart | Name | Natal part width | Traditional topic |
|---|---|---|---|
| D1 | Rashi | 30° | Overall natal placements and houses |
| D2 | Hora | 15° | Wealth and resources |
| D3 | Drekkana | 10° | Siblings and effort |
| D4 | Chaturthamsa | 7°30′ | Property and foundations |
| D7 | Saptamsa | 30/7° | Children and continuity |
| D9 | Navamsa | 3°20′ | Partnership and dharma |
| D10 | Dasamsa | 3° | Profession and public responsibilities |
| D12 | Dwadasamsa | 2°30′ | Parents and family line |
| D16 | Shodasamsa | 1°52′30″ | Comforts and vehicles |
| D20 | Vimsamsa | 1°30′ | Spiritual practice |
| D24 | Siddhamsa | 1°15′ | Learning |
| D27 | Bhamsa | 1°6′40″ | Strengths and weaknesses |
| D30 | Trimsamsa | Unequal segments | Difficulties |
| D40 | Khavedamsa | 45′ | Auspicious and adverse themes |
| D45 | Akshavedamsa | 40′ | Character and general themes |
| D60 | Shashtiamsa | 30′ | Fine traditional influences |
| D81 | Nava-Navamsa | 22′13.333…″ | D9 applied twice; additional fine division |

These are all 17 charts supported by this application, not every chart used by every tradition. Topic labels summarize traditional concepts; they are not verified predictions. D81 is an additional nested chart, not one of the classical sixteen divisions. D60 conventions vary; this app counts from the natal sign.

The twelve whole-sign houses concern: 1 identity, 2 resources and speech, 3 effort and siblings, 4 home, 5 creativity and learning, 6 service and conflict, 7 partnerships, 8 change and shared resources, 9 beliefs and guidance, 10 profession, 11 gains and networks, 12 expenditure and retreat. Houses in each divisional chart are counted from that chart's mapped ascendant. A sign is not a house, and a divisional position is not a new physical planetary position.

## Birth details and the LLM

The existing form takes date, recorded time and selected birthplace. Historical timezone conversion supplies UTC; Swiss Ephemeris computes planets and ascendant; deterministic mapping builds the charts. Date alone is insufficient for an ascendant and houses. Fine divisions are especially sensitive to birth-time errors.

The app uses Lahiri sidereal zodiac, mean lunar nodes, Moshier ephemeris and whole-sign houses. Each chart now shows its mapping rule and each planet's natal position, segment interval and mapped sign. Segment endpoints on screen are rounded to six decimals; calculations use unrounded values.

The existing local Ollama integration receives all computed divisional charts for follow-up questions. It explains results; it never calculates astronomical longitudes. This change does not train a new language model. With no configured or available model, the app supplies its existing basic symbolic reading. See README.md for OLLAMA_MODEL setup. Live model quality still requires evaluation.

## Sources

- Swiss Ephemeris calculation interface: https://www.astro.com/swisseph/swephprg.htm
- Traditional divisional considerations, Brihat Parashara Hora Shastra, chapter 7 in this translation: https://vedic-astro.s3.amazonaws.com/books/bhrihat_parasara_hora_shastra.pdf

Implementation tests check code behavior, not independent astronomical accuracy or the validity of astrological interpretations.

## Angles and retrograde symbol

℞ means apparent retrograde motion as viewed from Earth; it does not mean the planet physically reverses its orbit. The flag is inherited from the natal calculation in all divisional charts. Rahu and Ketu are lunar nodes, not physical planets.

Each chart cell shows a derived angle within its mapped sign, including the ascendant. D1 uses the natal angle. Other charts scale progress through the source segment to 0–30°: mapped angle = (natal degree − segment start) / segment width × 30. D30 uses this explicitly chosen display convention within its unequal segments; other software may use different conventions. These coordinates are not new astronomical longitudes. Exact natal positions remain available in the mapping explanation.

## Transit zodiac and per-chart summaries

Every supported chart has a personal natal summary and a transit table. A single snapshot at the reading generation timestamp supplies the nine planets/nodes for all 17 charts. D1 shows actual Lahiri sidereal transit positions; other divisions project these longitudes using the existing mapping rules, including unequal D30 segments. Tables retain actual zodiac positions beside derived divisional signs and angles. Houses are counted from the natal ascendant of each chart, not a newly calculated transit ascendant. Retrograde flags come from the current snapshot.

The snapshot is cached: chart selection and chat do not recalculate birth positions. Generate a new reading to refresh it. Divisional transit projections are labelled as derived coordinates and are not validated event forecasts. Tests verify shared timestamps, mapping and house consistency, not independent astronomical accuracy.

## Original birthplace coordinates and separate transit charts

Each chart displays the selected location lookup's unchanged latitude, longitude, timezone, provider and source URL. Geographic birthplace coordinates differ from planetary zodiac longitudes. The built-in locality uses OpenStreetMap via Mapcarta; other searches use Open-Meteo/GeoNames. Coordinates are not generated by a language model or by Swiss Ephemeris.

Each chart has a fixed calculated summary and a separate transit zodiac diagram with its own placement summary. Transit houses retain the natal ascendant reference. Chart overview endpoints bypass the language model even when Ollama is enabled; optional question-and-answer chat may still use it.

Chart displays default to North Indian fixed-house diamonds, including birth, divisional and transit views. The top diamond is house 1; signs proceed from the natal Lagna and zodiac numbers identify Aries=1 through Pisces=12. The advanced style selector still offers South Indian fixed-sign grids and placement tables.

LLM chat always receives the stored D1 as its primary birth chart, plus the selected chart as a labelled supplement. The supplied mapping rule and original natal longitudes connect the two. Derived chart angles are distinct from original zodiac angles; Nakshatra/pada remain natal fields. General answers start from D1, while explicit divisional questions use their supplied chart facts. Birth calculation and fixed chart summaries bypass the LLM.

## Report dropdown after birth details

The results page includes 31 grouped report choices. Core choices include sidereal Nirayana longitudes, D1, a Moon-reference Chandra chart, D9, package-calculated Bhav Chalit and separately calculated tropical Sayana longitudes. Sayana angular aspects use a stated five-degree orb; these are geometric relationships without AI-generated interpretations. Chandra houses start at the natal Moon sign; D1 zodiac positions remain unchanged. Bhav Chalit uses PyJHora's KN Rao equal-centred Bhava boundaries; this can change house placements without changing zodiac signs.

Four Shodashvarga pages group D1/D2/D3/D4, D7/D9/D10/D12, D16/D20/D24/D27, and D30/D40/D45/D60. The comparison table shows all sixteen charts. Additional choices open strength, point, yoga, dasha, advanced, annual, Panchanga and transit reports. Advanced report choices reuse the authenticated Lahiri D1 report cache. Settings remain available in the separate workbench. No account registration or persistence was introduced: the menu appears after the existing birth-details submission.

Print this report prints the chosen report. Existing calculation and interpretation limitations still apply.

Basic Details opens by default after submission. Its left column shows D1 followed by the Moon-reference Chandra chart; the right column shows D9 followed by Bhav Chalit. Compact birth diagrams omit transit panels here; transit views remain available through the other report choices.
