"""Editorial traditional screening rules, not calibrated event forecasts.

Natal charts are reused. Transits are monthly samples, never exact event dates.
"""
from datetime import datetime, timedelta, timezone
import astro

RULE_VERSION = 'editorial-screen-v1'
TOPICS = {
    'marriage': {'houses': [7], 'support': '9', 'indicators': ['Venus'], 'label': 'Marriage'},
    'wealth': {'houses': [2, 11], 'support': '2', 'indicators': [], 'label': 'Money and wealth'},
    'career': {'houses': [10], 'support': '10', 'indicators': [], 'label': 'Career'},
}

def monthly_dates(start, end):
    """Sample the start and then first-of-month UTC, within a half-open range."""
    yield start
    year, month = start.year, start.month
    while True:
        month += 1
        if month == 13:
            year, month = year + 1, 1
        date = datetime(year, month, 1, tzinfo=timezone.utc)
        if date >= end:
            break
        yield date


def transit_samples(start, end):
    result = []
    with astro.LOCK:
        astro.swe.set_sid_mode(astro.swe.SIDM_LAHIRI)
        for date in monthly_dates(start, end):
            jd = astro.swe.julday(date.year, date.month, date.day, date.hour + date.minute / 60 + date.second / 3600)
            planets = {}
            for name, body in [('Jupiter', astro.swe.JUPITER), ('Saturn', astro.swe.SATURN)]:
                values, _ = astro.swe.calc_ut(jd, body, astro.swe.FLG_MOSEPH | astro.swe.FLG_SIDEREAL)
                planets[name] = {'longitude': values[0], 'sign_index': int(values[0] // 30)}
            result.append({'date': date.isoformat(), 'planets': planets})
    return result


def analyze(chart, topic, samples=None):
    config = TOPICS[topic]
    start = datetime.fromisoformat(chart['generated_at'])
    end = start + timedelta(days=365.25 * 5)
    d1 = chart['charts']['1']
    support = chart['charts'][config['support']]
    relevant = {}
    placements = []
    def add(planet, reason):
        relevant.setdefault(planet, []).append(reason)
    for c, code in [(d1, 'D1'), (support, 'D' + config['support'])]:
        for house in config['houses']:
            ruler = astro.RULERS[(c['ascendant_index'] + house - 1) % 12]
            add(ruler, f'{code} house {house} ruler')
            ruler_position = next(p for p in c['planets'] if p['name'] == ruler)
            placements.append({'chart':code,'house':house,'sign':astro.SIGNS[(c['ascendant_index']+house-1)%12],'ruler':ruler,'ruler_sign':ruler_position['sign'],'ruler_house':ruler_position['house'],'sensitive':c['sensitive']})
            for p in c['planets']:
                if p['house'] == house:
                    add(p['name'], f'{code} house {house} occupant')
    for name in config['indicators']:
        add(name, 'editorial relationship indicator')
    samples = transit_samples(start, end) if samples is None else samples
    targets = {(d1['ascendant_index'] + house - 1) % 12 for house in config['houses']}
    windows = []
    for major in chart['dashas']['timeline']:
        for sub in major['subperiods']:
            a = max(start, datetime.fromisoformat(sub['start']))
            b = min(end, datetime.fromisoformat(sub['end']))
            if a >= b:
                continue
            reasons = []
            for level, lord in [('Mahadasha', major['lord']), ('Antardasha', sub['lord'])]:
                if lord in relevant:
                    reasons.append(f'{level} {lord}: ' + '; '.join(relevant[lord]))
            if not reasons:
                continue
            hits = []
            for sample in samples:
                date = datetime.fromisoformat(sample['date'])
                if not a <= date < b:
                    continue
                matches = []
                for name, p in sample['planets'].items():
                    # Whole-sign forward aspects: Jupiter 5/7/9, Saturn 3/7/10.
                    offsets = [0, 4, 6, 8] if name == 'Jupiter' else [0, 2, 6, 9]
                    touched = sorted(targets.intersection({(p['sign_index'] + offset) % 12 for offset in offsets}))
                    if touched:
                        matches.append({'planet': name, 'longitude': p['longitude'], 'sign': astro.SIGNS[p['sign_index']], 'target_signs': [astro.SIGNS[t] for t in touched]})
                if matches:
                    hits.append({'date': sample['date'], 'matches': matches})
            windows.append({'start': a.isoformat(), 'end': b.isoformat(), 'mahadasha': major['lord'], 'antardasha': sub['lord'], 'reasons': reasons, 'transit_samples': hits})
    return {'topic': topic, 'label': config['label'], 'rule_version': RULE_VERSION,
            'horizon_start': start.isoformat(), 'horizon_end': end.isoformat(),
            'relevant_planets': relevant, 'placements': placements, 'windows': windows,
            'sensitive_charts': [code for code in ['1', config['support']] if chart['charts'][code]['sensitive']],
            'limitations': ['Editorial screening rules have not been expert-approved or calibrated against outcomes.',
                           'A matching period is a topic-related traditional candidate, not a prediction, probability or favorable rating.',
                           'Transits are sampled monthly; no exact ingress, aspect orb, event date or continuous overlap is claimed.',
                           'Planetary strength, complete yogas and birth-time rectification are not assessed.']}


def build(chart):
    start = datetime.fromisoformat(chart['generated_at'])
    samples = transit_samples(start, start + timedelta(days=365.25 * 5))
    return {topic: analyze(chart, topic, samples) for topic in TOPICS}


def explain(chart, topic):
    data = chart.get('timing_analysis', {}).get(topic)
    if data is None:
        data = analyze(chart, topic)
    lines = [f"{data['label']} timing: Traditional candidate periods over five years from {data['horizon_start'][:10]}. These are unvalidated editorial screens, not guaranteed events or probabilities."]
    for window in data['windows'][:5]:
        lines.append(f"Candidate {window['start'][:10]} to {window['end'][:10]} (UTC, end excluded): {window['mahadasha']} / {window['antardasha']}. Reasons: " + ' | '.join(window['reasons']) + '.')
        hits = window['transit_samples']
        if hits:
            sample = hits[0]
            lines.append(f"Monthly transit sample {sample['date'][:10]}: " + '; '.join(f"{m['planet']} in {m['sign']} occupies or aspects {', '.join(m['target_signs'])} by the selected whole-sign rules" for m in sample['matches']) + f". {len(hits)} matching sample(s) in this period; this does not establish continuous support.")
        else:
            lines.append('No monthly transit sample matched within this period; it is a dasha-only candidate.')
    for placement in data.get('placements', []):
        lines.append(f"Placement reason: {placement['chart']} house {placement['house']} is {placement['sign']}; its ruler {placement['ruler']} is in {placement['ruler_sign']}, house {placement['ruler_house']}. A candidate is included when a dasha lord matches this ruler or a relevant occupant, not because that placement alone fixes an event date.")
    if not data['windows']:
        lines.append('No candidate met the selected dasha rules in this horizon. That does not mean the event cannot happen.')
    if len(data['windows']) > 5:
        lines.append(f"Showing the first 5 of {len(data['windows'])} candidates, chronologically, without ranking them.")
    if data['sensitive_charts']:
        lines.append('Birth-time sensitivity: ' + ', '.join('D' + k for k in data['sensitive_charts']) + ' changes ascendant in the ±1-minute samples; house-based reasons are provisional.')
    if topic == 'marriage':
        lines.append('A dasha end date is not a predicted wedding date. This analysis cannot establish whether or when marriage will occur.')
    elif topic == 'wealth':
        lines.append('No income amount, guaranteed gain, investment return or recommended trade is inferred. Actual finances require income, expense and savings information.')
    lines.append('Method: ' + RULE_VERSION + '; Lahiri sidereal, mean nodes, 365.25-day Vimshottari years. These rules are not reviewed corpus citations.')
    return '\n\n'.join(lines)
