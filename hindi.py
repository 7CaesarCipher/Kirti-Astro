"""Hindi summaries assembled from calculated facts, never generated predictions."""
import re
import astro
PLANETS=dict(zip(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'],['सूर्य','चंद्रमा','बुध','शुक्र','मंगल','गुरु','शनि','राहु','केतु']))
SIGNS=dict(zip(astro.SIGNS,['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन']))
QUESTIONS={
 'Explain my Moon placement briefly':'मेरे चंद्रमा की स्थिति थोड़े शब्दों में समझाएँ।',
 'Explain my Moon placement':'मेरे चंद्रमा की स्थिति समझाएँ।',
 'Show my marriage timing analysis':'शादी के लिए कौन-सा समय दिखाई देता है और क्यों?',
 'When could I get married?':'मेरी शादी कब हो सकती है?',
 'When are my money and wealth candidate periods?':'धन से जुड़े कौन-से समय दिखाई देते हैं?',
 'Explain my career timing analysis':'करियर से जुड़े समय और उनकी वजह समझाएँ।',
 'What does my chart show about learning?':'मेरी कुंडली में पढ़ाई से जुड़े क्या संकेत हैं?',
 'What does retrograde mean?':'वक्री का क्या मतलब है?',
}

def summary(chart, question, division=1):
    q=question.lower()
    for english, native in PLANETS.items():
        q=q.replace(native, english.lower())
    topics=astro.question_topics(q)
    c=chart['charts'][str(division)]
    if 'health' in topics:
        return 'कुंडली से बीमारी, उम्र या गर्भावस्था का पता नहीं लगाया जा सकता। मैं ग्रहों की गणना की गई स्थिति समझा सकता हूँ।'
    lines=[]
    data=chart.get('assessment')
    if any(topic in topics for topic in ['strength','ashtakavarga','yoga']):
        if not data:return 'इस सत्र में ग्रह-बल की गणना उपलब्ध नहीं है। नई कुंडली बनाएँ।'
        if 'strength' in topics:
            lines.append('षड्बल में ग्रह-बल के छह हिस्से गिने गए हैं। 60 विरूप = 1 रूप। यह कोई सफलता की संभावना नहीं है।')
            for row in data['shadbala']['planets']:
                parts=row['components_virupas']
                lines.append(f"{PLANETS[row['planet']]}: स्थान {parts['sthana']}, समय {parts['kala']}, दिशा {parts['dig']}, गति {parts['cheshta']}, नैसर्गिक {parts['naisargika']}, दृष्टि {parts['drik']} विरूप। कुल {row['total_virupas']} विरूप।")
        if 'ashtakavarga' in topics:
            a=data['ashtakavarga'];lines.append(f"अष्टकवर्ग के कुल सर्वाष्टकवर्ग अंक: {a['sav_total']}।")
            lines.extend(f"{SIGNS[sign]}: {score} अंक।" for sign,score in zip(astro.SIGNS,a['sav']))
        if 'yoga' in topics:
            y=data['yogas'];lines.append(f"D1 में सूची के {y['catalogue_size']} योगों की जाँच हुई। {y['present_count']} मिले और {y['not_evaluated_count']} की गणना नहीं हो सकी।")
            lines.append('मिले हुए योग: '+', '.join(r['name'] for r in y['checks'] if r['status']=='present')+'।')
        lines.append('इनकी गणना तय तरीके से हुई है। दूसरे स्वतंत्र इंजन से जाँच अभी बाकी है। योग मिलने का मतलब पक्का लाभ या पक्की घटना नहीं है। किताब के OCR अंश अपने आप सत्यापित नहीं माने गए हैं।')
        return '\n\n'.join(lines)

    for topic in topics:
        if topic in ['marriage','wealth','career']:
            label={'marriage':'शादी','wealth':'धन','career':'करियर'}[topic]
            data=chart.get('timing_analysis',{}).get(topic)
            if data:
                lines.append(f'{label} के लिए देखने लायक समय:')
                windows=data['windows'][:3]
                if not windows:
                    lines.append('अगले पाँच साल में ऐप के नियमों से कोई समय नहीं मिला। इसका मतलब यह नहीं कि ऐसा हो ही नहीं सकता।')
                for w in windows:
                    lines.append(f"{w['start'][:10]} से {w['end'][:10]} तक (UTC, आखिरी तारीख शामिल नहीं है)। इस दौरान {PLANETS[w['mahadasha']]} की महादशा और {PLANETS[w['antardasha']]} की अंतरदशा है।")
                    for lord in [w['mahadasha'],w['antardasha']]:
                        for reason in data['relevant_planets'].get(lord,[]):
                            match=re.fullmatch(r'(D\d+) house (\d+) (ruler|occupant)',reason)
                            if match:
                                code,house,role=match.groups()
                                lines.append(f"वजह: {PLANETS[lord]} {code} में भाव {house} "+('का स्वामी है।' if role=='ruler' else 'में स्थित है।'))
                            elif reason=='editorial relationship indicator':
                                lines.append('वजह: ऐप के नियमों में शुक्र को रिश्तों से जुड़ा ग्रह माना गया है।')
                    if w['transit_samples']:
                        sample=w['transit_samples'][0]
                        for m in sample['matches']:
                            targets=', '.join(SIGNS[s] for s in m['target_signs'])
                            lines.append(f"{sample['date'][:10]} के गोचर नमूने में {PLANETS[m['planet']]} {SIGNS[m['sign']]} में है। ऐप के राशि-आधारित नियमों से इसका संबंध {targets} से बनता है। यह पूरे समय ऐसा रहने का प्रमाण नहीं है।")
                    else:
                        lines.append('इस अवधि में कोई मासिक गोचर नमूना नहीं मिला। यह समय केवल दशा के संबंध से चुना गया है।')
                for p in data.get('placements',[]):
                    lines.append(f"{p['chart']}: भाव {p['house']} में {SIGNS[p['sign']]} राशि है। इसके स्वामी {PLANETS[p['ruler']]} {SIGNS[p['ruler_sign']]} में, भाव {p['ruler_house']} में हैं।")
                if data['sensitive_charts']:
                    lines.append(', '.join('D'+code for code in data['sensitive_charts'])+' का लग्न जन्म समय में लगभग एक मिनट के बदलाव से बदलता है। इसलिए भावों से जुड़ी बातों में सावधानी रखें।')
                lines.append('ये ऐप के तय किए हुए पारंपरिक नियमों से चुने गए समय हैं। इनकी भविष्यवाणी की क्षमता साबित नहीं है।')
                lines.append('यह शादी की पक्की तारीख नहीं है।' if topic=='marriage' else 'इससे पक्का लाभ, आय की रकम या करियर में सफलता तय नहीं होती।')
            else:
                lines.append(f'{label} की समय-गणना इस सत्र में उपलब्ध नहीं है।')
        if topic in ['learning','home']:
            for house in ([5,9] if topic=='learning' else [4]):
                ruler=astro.RULERS[(c['ascendant_index']+house-1)%12]
                p=next(p for p in c['planets'] if p['name']==ruler)
                lines.append(f"D{division}: भाव {house} के स्वामी {PLANETS[ruler]} {SIGNS[p['sign']]} राशि में, भाव {p['house']} में हैं। यह पारंपरिक संकेत है, पक्का परिणाम नहीं।")
    if lines:return '\n\n'.join(lines)
    for p in c['planets']:
        if re.search(r'\b'+p['name'].lower()+r'\b',q):
            lines.append(f"D{division} में {PLANETS[p['name']]} {SIGNS[p['sign']]} राशि में, भाव {p['house']} में हैं।")
    if lines:return '\n\n'.join(lines)
    if 'retrograde' in q or 'वक्री' in q or '℞' in q:return '℞ का मतलब वक्री है। पृथ्वी से देखने पर ग्रह कुछ समय पीछे चलता हुआ लगता है। ग्रह अपनी कक्षा में सचमुच उल्टा नहीं घूमता।'
    if 'ascendant' in q or 'लग्न' in q:return f"D{division} का लग्न {SIGNS[c['ascendant']]} है। भाव इसी राशि से गिने जाते हैं।"
    if q.strip() in ['overview','general','general reading']:
        return '\n\n'.join([f"D{division} का लग्न {SIGNS[c['ascendant']]} है।"]+[f"{PLANETS[p['name']]} {SIGNS[p['sign']]} राशि में, भाव {p['house']} में हैं।" for p in c['planets']])
    return None
