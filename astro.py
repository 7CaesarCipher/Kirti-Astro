"""Deterministic sidereal calculations. Never call the LLM to calculate charts."""
import math,threading,re
from datetime import datetime,timedelta,timezone
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError
import swisseph as swe
LOCK=threading.RLock()
SIGNS='Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces'.split()
NAK=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']
LORDS=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];YEARS=[7,20,6,10,7,18,16,19,17]
RULERS=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']
VARGAS=[1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60,81]
def division(x,n):
 r=int(x//30);d=x%30;k=int(d*n/30);odd=r%2==0
 if n==1:return r
 if n==2:return (4 if d<15 else 3) if odd else (3 if d<15 else 4)
 if n==3:return (r+4*k)%12
 if n==4:return (r+3*k)%12
 if n==7:return (r+(0 if odd else 6)+k)%12
 if n==9:return (r*9+k)%12
 if n==81:
  d9=division(x,9)
  d9_longitude=d9*30+(d%(30/9))*9
  return division(d9_longitude,9)
 if n==10:return (r+(0 if odd else 8)+k)%12
 if n==12:return (r+k)%12
 if n in [16,45]:return ([0,4,8][r%3]+k)%12
 if n==20:return ([0,8,4][r%3]+k)%12
 if n==24:return ((4 if odd else 3)+k)%12
 if n==27:return ([0,3,6,9][r%4]+k)%12
 if n==30:
  bounds,signs=([5,10,18,25,30],[0,10,8,2,6]) if odd else ([5,12,20,25,30],[1,5,11,9,7])
  return next(s for b,s in zip(bounds,signs) if d<b)
 if n==40:return ((0 if odd else 6)+k)%12
 if n==60:return (r+k)%12
 raise ValueError('Unsupported division')
DIVISION_RULES={
 1:'Keep the natal sign.',
 2:'Odd signs: Leo then Cancer. Even signs: Cancer then Leo.',
 3:'Start at the natal sign; advance four signs per part.',
 4:'Start at the natal sign; advance three signs per part.',
 7:'Start at the natal sign for odd signs, its seventh for even signs; count forward.',
 9:'Start at the natal sign for movable signs, its ninth for fixed signs, its fifth for dual signs; count forward.',
 10:'Start at the natal sign for odd signs, its ninth for even signs; count forward.',
 12:'Start at the natal sign; count forward.',
 16:'Start at Aries / Leo / Sagittarius for movable / fixed / dual signs; count forward.',
 20:'Start at Aries / Sagittarius / Leo for movable / fixed / dual signs; count forward.',
 24:'Start at Leo for odd signs, Cancer for even signs; count forward.',
 27:'Start at Aries / Cancer / Libra / Capricorn for fire / earth / air / water signs; count forward.',
 30:'Use five unequal Parashari segments, not thirty equal one-degree mappings.',
 40:'Start at Aries for odd signs, Libra for even signs; count forward.',
 45:'Start at Aries / Leo / Sagittarius for movable / fixed / dual signs; count forward.',
 60:'This implementation starts at the natal sign and counts forward; conventions vary.',
 81:'Apply D9, including its within-sign position, then apply D9 again.'}

def division_details(longitude,n):
 """Explain the existing mapping; degrees remain explicitly natal degrees."""
 if n not in VARGAS:raise ValueError('Unsupported division')
 x=float(longitude)
 if not math.isfinite(x):raise ValueError('Longitude must be finite')
 x%=360;degree=x%30;r=int(x//30)
 if n==30:
  bounds=[0,5,10,18,25,30] if r%2==0 else [0,5,12,20,25,30]
  k=next(i for i in range(5) if degree<bounds[i+1])
  start,end=bounds[k:k+2]
 else:
  k=min(n-1,int(degree*n/30));start=k*30/n;end=(k+1)*30/n
 seconds=min(107999,int(round(degree*3600)))
 return {'natal_longitude':x,'natal_sign':SIGNS[r],'natal_degree':degree,
         'natal_position':f"{SIGNS[r]} {seconds//3600}°{seconds%3600//60:02d}′{seconds%60:02d}″",
         'segment':k+1,'segment_count':5 if n==30 else n,
         'segment_start_degree':start,'segment_end_degree':end,
         'segment_width_degree':end-start,'mapped_degree':min(30.0, max(0.0, (degree-start)/(end-start)*30)),'mapped_sign':SIGNS[division(x,n)],
         'rule':DIVISION_RULES[n]}

def utc_birth(date,time,tz):
 try:naive=datetime.fromisoformat(date+'T'+time);zone=ZoneInfo(tz)
 except (ValueError,ZoneInfoNotFoundError):raise ValueError('Enter a valid birth date, time and place.')
 if not 1900<=naive.year<=2100:raise ValueError('Supported birth years: 1900–2100.')
 possibilities=set()
 for fold in [0,1]:
  candidate=naive.replace(tzinfo=zone,fold=fold).astimezone(timezone.utc)
  if candidate.astimezone(zone).replace(tzinfo=None)==naive:possibilities.add(candidate)
 if not possibilities:raise ValueError('This local time did not exist during a clock change. Check the recorded time.')
 if len(possibilities)>1:raise ValueError('This time occurred twice during a clock change. An exact UTC offset is needed; choose a verified unambiguous time before calculating.')
 result=possibilities.pop()
 if result>datetime.now(timezone.utc):raise ValueError('Birth date cannot be in the future.')
 return result

def dashas(moon,birth,now):
 i=int(moon/(40/3))%9;fraction=(moon%(40/3))/(40/3)
 start=birth-timedelta(days=fraction*YEARS[i]*365.25);periods=[]
 for step in range(18):
  idx=(i+step)%9;end=start+timedelta(days=YEARS[idx]*365.25);subs=[];a=start
  for k in range(9):
   sub=(idx+k)%9;b=a+timedelta(days=YEARS[idx]*YEARS[sub]/120*365.25)
   subs.append({'lord':LORDS[sub],'start':a.isoformat(),'end':b.isoformat(),'current':a<=now<b});a=b
  periods.append({'lord':LORDS[idx],'start':start.isoformat(),'end':end.isoformat(),'current':start<=now<end,'subperiods':subs});start=end
 return {'current':next((p for p in periods if p['current']),None),'timeline':[p for p in periods if datetime.fromisoformat(p['end'])>now][:4],'year_days':365.25}

def calculate(profile,now=None):
 now=now or datetime.now(timezone.utc);place=profile['place'];lat=float(place['latitude']);lon=float(place['longitude'])
 if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat)>=66 or abs(lon)>180:raise ValueError('This release supports latitudes between 66° south and 66° north.')
 birth=utc_birth(profile['date'],profile['time'],place['timezone']);jd=swe.julday(birth.year,birth.month,birth.day,birth.hour+birth.minute/60+birth.second/3600)
 with LOCK:
  swe.set_sid_mode(swe.SIDM_LAHIRI)
  asc=swe.houses_ex(jd,lat,lon,b'W',swe.FLG_SIDEREAL)[1][0]
  positions={};flags=swe.FLG_MOSEPH|swe.FLG_SIDEREAL|swe.FLG_SPEED
  for name,planet in [('Sun',0),('Moon',1),('Mercury',2),('Venus',3),('Mars',4),('Jupiter',5),('Saturn',6),('Rahu',swe.MEAN_NODE)]:
   values,ret=swe.calc_ut(jd,planet,flags);positions[name]={'longitude':values[0],'retrograde':values[3]<0}
  positions['Ketu']={'longitude':(positions['Rahu']['longitude']+180)%360,'retrograde':positions['Rahu']['retrograde']}
  samples=[swe.houses_ex(jd+m/1440,lat,lon,b'W',swe.FLG_SIDEREAL)[1][0] for m in [-1,-.5,0,.5,1]]
  ayan=swe.get_ayanamsa_ut(jd)
 for name,p in positions.items():
  x=p['longitude'];p.update(name=name,sign=SIGNS[int(x/30)],sign_index=int(x/30),degree=x%30,house=(int(x/30)-int(asc/30))%12+1,nakshatra=NAK[int(x/(40/3))],pada=int((x%(40/3))/(10/3))+1)
 charts={}
 for n in VARGAS:
  a=division(asc,n);charts[str(n)]={'division':n,'mapping_rule':DIVISION_RULES[n],'ascendant_mapping':division_details(asc,n),'ascendant':SIGNS[a],'ascendant_index':a,'sensitive':len({division(v,n) for v in samples})>1,'planets':[dict(p,mapping=division_details(p['longitude'],n),sign=SIGNS[division(p['longitude'],n)],sign_index=division(p['longitude'],n),house=(division(p['longitude'],n)-a)%12+1) for p in positions.values()]}
 return {'profile':profile,'birth_utc':birth.isoformat(),'generated_at':now.isoformat(),'ascendant':{'sign':SIGNS[int(asc/30)],'degree':asc%30},'planets':list(positions.values()),'charts':charts,'dashas':dashas(positions['Moon']['longitude'],birth,now),'settings':{'zodiac':'Sidereal','ayanamsa':'Lahiri','ayanamsa_degrees':ayan,'houses':'Whole sign','nodes':'Mean','ephemeris':'Swiss Ephemeris / Moshier','version':swe.version,'varga_convention':'Parashari; D2 Cancer/Leo, unequal D30, D60 counted from natal sign; D81 applies the conventional Navamsa mapping twice'},'warnings':['Birth time is treated as recorded to the minute. Sensitivity is sampled at ±30 and ±60 seconds; it is not a complete birth-time rectification.','Birthplace coordinates represent a locality, not a precise delivery-room location.','Divisional chart interpretation is traditional and not scientifically predictive.']}

HOUSE_THEMES={1:'identity and personal direction',3:'communication and independent effort',4:'home and foundations',6:'service and daily responsibilities',8:'change and shared resources',9:'learning, beliefs and guidance',2:'savings, speech and family resources',5:'learning, creativity and judgement',7:'partnerships and collaboration',10:'profession and public responsibilities',11:'income, networks and ambitions',12:'expenditure, privacy and retreat'}
CHART_TOPICS={2:'wealth and resources',3:'siblings and effort',4:'home and property',7:'children and creativity',9:'partnerships and dharma',10:'profession and public responsibilities',12:'parents and family line',16:'comforts and vehicles',20:'spiritual practice',24:'learning and education',27:'strengths and weaknesses',30:'difficulties and challenges',40:'auspicious traditional themes',45:'character and conduct',60:'fine traditional influences',81:'nested Navamsa themes'}
def question_topics(question):
 q=question.lower()
 topics=[]
 patterns={
  'strength':r'\b(?:shadbala|shad\s*bala|planetary.strength|strength|bala)\b|षड्बल|ग्रह.बल',
  'ashtakavarga':r'\b(?:ashtakavarga|ashtaka.varga|bav|sav)\b|अष्टकवर्ग',
  'yoga':r'\b(?:yogas?|sunapha|anapha|durudhura|gajakesari)\b|योग',
  'marriage':r'\b(?:marry|married|marriage|wedding|spouse|husband|wife|relationships?|partners?|shaadi|shadi)\b|शादी|विवाह|रिश्त',
  'wealth':r'\b(?:money|wealth|rich|richer|richest|financ\w*|savings?|income|salary|earn\w*|debt|loan|cash|assets?|profits?|invest\w*|portfolio|paisa|dhan)\b|धन|पैस|आय|कमाई',
  'career':r'\b(?:career|jobs?|work|business|profession|promotion|employment)\b|करियर|नौकरी',
  'learning':r'\b(?:learning|education|study|studies|college|school|exam\w*)\b|शिक्षा|पढ़ाई',
  'home':r'\b(?:home|property|house purchase|relocation)\b|घर|संपत्ति',
  'health':r'\b(?:health|death|disease|lifespan|pregnan\w*|diagnos\w*)\b|स्वास्थ्य|बीमारी',
 }
 for topic,pattern in patterns.items():
  if re.search(pattern,q):topics.append(topic)
 return topics

def reading(chart,question='overview',division=1):
 if str(division) not in chart['charts']:raise ValueError('Choose a supported chart.')
 division=int(division);q=question.lower();topics=question_topics(question)
 c=chart['charts'][str(division)];ps={p['name']:p for p in c['planets']}
 if 'health' in topics:return 'A birth chart cannot diagnose health conditions, establish lifespan or predict pregnancy. I can explain calculated chart placements.'
 if any(topic in topics for topic in ['strength','ashtakavarga','yoga']):
  import assessment
  return assessment.explain(chart,topics)
 is_timing=bool(re.search(r'\b(?:when|timing|date|year|age|soon|kab)\b|कब',q))
 if topics:
  paragraphs=[]
  for topic in topics:
   if topic in ['marriage','wealth','career'] and (is_timing or 'analysis' in q):
    import timing
    paragraphs.append(timing.explain(chart,topic))
   houses={'marriage':[7],'wealth':[2,11],'career':[10],'learning':[5,9],'home':[4]}[topic]
   label={'marriage':'Relationships','wealth':'Money and wealth','career':'Career','learning':'Learning','home':'Home'}[topic]
   for h in houses:
    ruler=RULERS[(c['ascendant_index']+h-1)%12];p=ps[ruler]
    paragraphs.append(f"{label} in D{division}: House {h} is {SIGNS[(c['ascendant_index']+h-1)%12]}, ruled by {ruler}. {ruler} is in {p['sign']}, house {p['house']}. Traditionally, house {h} concerns {HOUSE_THEMES[h]}; its ruler links that theme symbolically with {HOUSE_THEMES[p['house']]}. This is not a guaranteed outcome.")
   if topic=='marriage' and division not in [1,9]:paragraphs.append('Marriage timing uses D1 and D9; the selected chart placements above remain separately labelled.')
   if topic=='wealth':
    d2=chart['charts']['2'];paragraphs.append(f"D2 Hora ascendant: {d2['ascendant']}. The Cancer/Leo convention is used. This supplementary wealth chart does not quantify money or establish future returns.")
  sensitive=[f'D{k}' for k in dict.fromkeys([str(division),'9' if 'marriage' in topics else str(division)]) if chart['charts'][k]['sensitive']]
  if sensitive:paragraphs.append('Birth-time sensitivity: '+', '.join(sensitive)+' ascendant changes within the sampled ±1-minute range. House-based interpretations are provisional.')
  return '\n\n'.join(paragraphs)
 chart_question=re.search(r'\bd(?:1|2|3|4|7|9|10|12|16|20|24|27|30|40|45|60|81)\b',q)
 if chart_question:
  code=chart_question.group()[1:];n=int(code)
  return f"D{n}: "+('overall natal placements and houses' if n==1 else CHART_TOPICS[n])+'. Mapping: '+DIVISION_RULES[n]+f" Your D{n} ascendant is {chart['charts'][code]['ascendant']}. These are traditional chart themes, not verified forecasts."
 if 'retrograde' in q or '℞' in q:
  names=[p['name'] for p in c['planets'] if p['retrograde']]
  return '℞ means apparent backward motion through the zodiac as viewed from Earth. Natal retrograde flags are carried into every divisional chart. Flagged in your chart: '+', '.join(names)+'. Rahu and Ketu are lunar nodes, not physical planets.'
 if 'ascendant' in q or 'lagna' in q:return f"D{division} ascendant: {c['ascendant']}. Whole-sign houses are counted from this sign. The ascendant depends on recorded birth time and location."
 named=[p for p in c['planets'] if re.search(r'\b'+re.escape(p['name'].lower())+r'\b',q)]
 if named:return '\n\n'.join(f"D{division} {p['name']}: {p['sign']}, house {p['house']}. Natal longitude: {p['longitude']:.6f}°. Natal position: {p['mapping']['natal_position']}. Mapped sign angle: {p['mapping']['mapped_degree']:.6f}°." for p in named)
 overview=q.strip() in ['overview','general','general reading','tell me about my chart','personality']
 if not overview:return 'Basic mode did not recognize this question. Ask about marriage, money/wealth, career, learning, home, an individual planet, the ascendant, or retrograde motion. Natural-language follow-ups beyond these topics need the configured local language model.'
 if division!=1:
  paragraphs=[f"D{division}: Traditional focus — {CHART_TOPICS[division]}. Ascendant: {c['ascendant']}. These are symbolic themes, not guaranteed outcomes."]
  for p in c['planets']:paragraphs.append(f"{p['name']}: {p['sign']}, house {p['house']}. This places its symbolic role within {HOUSE_THEMES[p['house']]} in D{division}.")
  paragraphs.append('Mapping: '+c['mapping_rule'])
 else:
  paragraphs=['D1 · Birth chart: basic symbolic overview.']
  for label,h in [('Learning',5),('Career',10),('Money',2),('Relationships',7)]:
   ruler=RULERS[(c['ascendant_index']+h-1)%12];p=ps[ruler]
   paragraphs.append(f"{label}: The D1 house {h} ruler is {ruler}, placed in {p['sign']} in house {p['house']}. Traditionally, this links {HOUSE_THEMES[h]} with {HOUSE_THEMES[p['house']]}. This is not a guaranteed outcome.")
 current=chart['dashas']['current']
 if current:paragraphs.append(f"Calculated current Mahadasha: {current['lord']}. Period boundaries are not event predictions.")
 if c['sensitive']:paragraphs.append(f"D{division} ascendant changes in the sampled ±1-minute range; house-based interpretations are provisional.")
 return '\n\n'.join(paragraphs)
