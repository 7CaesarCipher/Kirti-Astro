# Advanced PyJHora analysis

The app integrates PyJHora 4.8.7 (AGPL-3.0-or-later), not the proprietary JHora desktop program. Desktop reference: https://www.vedicastrologer.org/jh/ . Package source: https://github.com/naturalstupid/PyJHora . No claim of independently verified desktop equivalence is made.

After generating a birth reading, open **Advanced PyJHora analysis** and calculate a report. Reports remain in the existing memory session; repeat requests with identical settings reuse an eight-entry cache. The original birth chart is not recalculated. No birth profile is sent to an external calculation service. Download and print occur only on the user's action.

| Area | Implemented scope |
| --- | --- |
| Birth data | Original birthplace coordinates, degrees, Lagna, signs, whole-sign houses, Nakshatra and pada |
| Divisions | 23 package-predefined divisions, method 1; custom cyclic factors 1–300, including predefined factors when entered in the custom field |
| Dashas | Vimshottari, Yogini, Kalachakra and Narayana; selectable major, subperiod and sub-subperiod depth |
| Strength | Existing six-category Shadbala; new 6/7/10/16-varga Vimsopaka; five Baladi age states |
| Ashtakavarga | Existing reductions and Pindas; selected-ayanamsa BAV/SAV and monthly transit point scoring |
| Yogas | 284 rules in the pinned catalogue attempted for the selected division; absent rules omitted from the display; failures explicitly marked |
| Gochara | Twelve monthly samples for seven classical planets, zodiac/angle/natal house, retrograde and BAV/SAV heatmap |
| Advanced | Selected-division Arudha Padas and Graha aspects, eight Chara Karakas, eight special Lagnas |
| Annual/Panchanga | Tajaka solar-return chart, Tithi Pravesha dates/times, birth Tithi/Nakshatra/Yoga/Karana, Vedic weekday, sunrise/sunset |
| Settings/output | Lahiri/Raman/Krishnamurti/Fagan–Bradley; Whole sign/Equal/Placidus cusp tables; South/North Indian diagrams and tables; English/Hindi/Tamil/Telugu/Kannada/Malayalam package names; print and JSON download |

The house-system selection changes the separate cusp table. Varga houses remain whole sign. Advanced vargas follow package method 1 and may differ from the main chart's explicit Parashari variants. The predefined selector uses package method 1. Entering a factor in the custom field explicitly uses cyclic mapping, including for predefined factors. Custom reverse/non-cyclic variants are not exposed because package documentation calls their JHora agreement experimental.

Main-panel Shadbala and reductions remain Lahiri results; they are not silently relabelled when a different advanced ayanamsa is selected. Advanced Vimsopaka, BAV/SAV, charts and returns use the selected ayanamsa. The language option selects package names, not free-form translated prediction text; some descriptions remain in English. Six package name languages are offered: English, Hindi, Tamil, Telugu, Kannada and Malayalam; UI headings and some descriptions remain English.

Dasha start times are local to the birth location historical UTC offset. The package's default year convention can differ from the main 365.25-day timeline. Panchanga start/end hours can extend before 0 or after 24; these are relative to the shown local date. Tithi and Yoga end estimates use the package's daily-motion convention. Annual returns use the birth locality; relocation is not implemented. Tithi Pravesha can have multiple matching results and empty results are retained rather than invented.

Monthly transit samples are not ingress times or continuous intervals. Traditional points, yoga matches, strength and planetary age states are not event probabilities, promises, medical diagnoses or lifespan estimates. Tests validate shape, position agreement within the configured engine, SAV invariants, caching, options and global-setting restoration. They do not independently validate every algorithm against JHora desktop or an astronomical reference.

Corpus research excerpts and approvals remain unchanged in the existing assessment panel. Calculated reports do not turn unreviewed OCR into interpretive evidence.
