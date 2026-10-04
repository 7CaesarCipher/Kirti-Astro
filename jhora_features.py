"""On-demand offline PyJHora analysis; not the JHora desktop application."""
import contextlib,io,math,copy
from datetime import datetime,timezone,timedelta
from zoneinfo import ZoneInfo
import astro
PREDEFINED=[1,2,3,4,5,6,7,8,9,10,11,12,16,20,24,27,30,40,45,60,81,108,144]
PLANETS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
AYANAMSAS={'LAHIRI':astro.swe.SIDM_LAHIRI,'RAMAN':astro.swe.SIDM_RAMAN,'KP':astro.swe.SIDM_KRISHNAMURTI,'FAGAN':astro.swe.SIDM_FAGAN_BRADLEY}

def options(data,chart):
 def integer(key,default,low,high):
  raw=data.get(key,default)
  if isinstance(raw,bool) or str(raw)!=str(int(raw)):raise ValueError('Invalid '+key)
  value=int(raw)
  if not low<=value<=high:raise ValueError(f'{key} must be between {low} and {high}')
  return value
 settings={'division':integer('division',1,1,300),'depth':integer('depth',2,1,3),'year':integer('year',max(datetime.fromisoformat(chart['generated_at']).year,int(chart['profile']['date'][:4])+1),int(chart['profile']['date'][:4])+1,2100),'ayanamsa':str(data.get('ayanamsa','LAHIRI')).upper(),'houses':str(data.get('houses','W')),'language':str(data.get('language','en')),'custom':data.get('custom',False)}
 if settings['ayanamsa'] not in AYANAMSAS:raise ValueError('Choose a supported ayanamsa')
 if settings['houses'] not in ['W','E','P']:raise ValueError('Choose Whole sign, Equal or Placidus houses')
 if not isinstance(settings['custom'],bool):raise ValueError('Invalid custom mapping option')
 if settings['language'] not in ['en','hi','ta','te','ka','ml']:raise ValueError('Choose an available report language')
 return settings

def position_chart(pp,n,profile,label=None):
 asc=int(pp[0][1][0]);rows=[]
 for identifier,(sign,degree) in pp[1:10]:
  rows.append({'name':PLANETS[int(identifier)],'sign':astro.SIGNS[int(sign)],'sign_index':int(sign),'degree':float(degree),'house':(int(sign)-asc)%12+1,'longitude':int(sign)*30+float(degree),'nakshatra':astro.NAK[int((int(sign)*30+float(degree))/(40/3))] if n==1 else None,'pada':int(((int(sign)*30+float(degree))%(40/3))/(10/3))+1 if n==1 else None})
 from jhora import utils
 for row in rows:
  row['display_name']=utils.PLANET_NAMES[PLANETS.index(row['name'])];row['display_sign']=utils.RAASI_LIST[row['sign_index']]
 return {'division':n,'label':label or f'D{n}','ascendant':astro.SIGNS[asc],'ascendant_index':asc,'ascendant_degree':float(pp[0][1][1]),'planets':rows,'birthplace':profile['place'],'summary':f"{label or ('D'+str(n))}: {astro.SIGNS[asc]} ascendant; "+'; '.join(f"{p['name']} in {p['sign']} {p['degree']:.2f}°, house {p['house']}" for p in rows)+'. These are calculated placements, not event predictions.'}

def annual_reading(annual,natal):
 """Editorial house-ruler interpretation, with calculated evidence."""
 themes={2:'savings and family resources',4:'home and foundations',7:'partnerships',10:'work and public responsibilities',11:'income and networks'}
 readings=[]
 for topic,houses in [('Relationships',[7]),('Career',[10]),('Money',[2,11]),('Home',[4])]:
  evidence=[];interpretation=[]
  for h in houses:
   sign=astro.SIGNS[(annual['ascendant_index']+h-1)%12]
   ruler=astro.RULERS[(annual['ascendant_index']+h-1)%12]
   planet=next(p for p in annual['planets'] if p['name']==ruler)
   original=next(p for p in natal['planets'] if p['name']==ruler)
   occupants=[p['name'] for p in annual['planets'] if p['house']==h]
   evidence.append(f"Annual house {h}: {sign}; ruler {ruler} at {planet['sign']} {planet['degree']:.4f}°, annual house {planet['house']}; natal D1 house {original['house']}. Occupants: {', '.join(occupants) or 'none'}.")
   interpretation.append(f"The {themes[h]} theme connects with {astro.HOUSE_THEMES[planet['house']]} through {ruler}. Give attention to that connection during this annual period.")
  readings.append({'topic':topic,'evidence':evidence,'interpretation':' '.join(interpretation)})
 return {'method':'Editorial whole-sign house-ruler reading of a Tajaka solar-return chart; not a complete Tajaka prediction system.','topics':readings,'limitation':'Coordinates calculate the chart geometry; they do not establish a reliable event prediction. Annual rulership, Tajaka yogas and annual dashas are not assessed here.'}

def calculate(chart,settings):
 with astro.LOCK,contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
  return _calculate(chart,settings)

def _calculate(chart,settings):
 from jhora import const,utils
 from jhora.panchanga import drik,vratha
 from jhora.horoscope.chart import charts,arudhas,house,ashtakavarga,yoga
 from jhora.horoscope.dhasa.graha import vimsottari,yogini
 from jhora.horoscope.dhasa.raasi import kalachakra,narayana
 from jhora.horoscope.transit import tajaka
 original_custom=const.TREAT_STANDARD_CHART_AS_CUSTOM
 sections=[]
 def section(name,headers,fn):
  try:
   rows=fn()
   if rows is None:raise ValueError('No calculation returned')
   sections.append({'name':name,'status':'calculated','headers':headers,'rows':rows})
  except Exception as error:sections.append({'name':name,'status':'not_calculated','reason':type(error).__name__})
 with astro.LOCK,contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
  const.TREAT_STANDARD_CHART_AS_CUSTOM=False
  const.use_internet_for_location_check=False;const.check_database_for_world_cities=False;const.get_place_elevation_from_internet=False;const.set_node_mode(False)
  drik._sidereal_planet_list={body:i for i,body in enumerate([const._SUN,const._MOON,const._MARS,const._MERCURY,const._JUPITER,const._VENUS,const._SATURN,const._RAHU,const._KETU])};drik.planet_list=drik._sidereal_planet_list.copy()
  drik.PLANET_FLAGS=astro.swe.FLG_MOSEPH|astro.swe.FLG_SIDEREAL|astro.swe.FLG_SPEED
  drik.set_ayanamsa_mode(settings['ayanamsa']);utils.set_language(settings['language'])
  birth=datetime.fromisoformat(chart['birth_utc']);p=chart['profile']['place'];zone=ZoneInfo(p['timezone']);local=birth.astimezone(zone)
  dob=(local.year,local.month,local.day);tob=(local.hour,local.minute,local.second);place=drik.Place('Birth locality',p['latitude'],p['longitude'],local.utcoffset().total_seconds()/3600,elevation=0.0);jd=utils.julian_day_number(dob,tob)
  try:
   pp=charts.rasi_chart(jd,place)
   all_charts=[position_chart(charts.divisional_chart(jd,place,n,chart_method=1),n,chart['profile']) for n in PREDEFINED]
   n=settings['division'];selected=None if settings['custom'] else next((c for c in all_charts if c['division']==n),None)
   selected_pp=charts.divisional_chart(jd,place,n,chart_method=1) if n in PREDEFINED and not settings['custom'] else charts.custom_divisional_chart(pp,n,chart_method=0,base_rasi=None,count_from_end_of_sign=False)
   if selected is None:selected=position_chart(selected_pp,n,chart['profile'],f'D{n} custom cyclic')
   def panchanga_rows():
    values=[]
    for title,fn,names in [('Tithi',drik.tithi,utils.TITHI_LIST),('Nakshatra',drik.nakshatra,utils.NAKSHATRA_LIST),('Yoga',drik.yogam,utils.YOGAM_LIST),('Karana',drik.karana,utils.KARANA_LIST)]:
     result=fn(jd,place);index=int(result[0]);times=result[2:4] if title=='Nakshatra' else result[1:3]
     name=names[index-1]
     if title=='Tithi':name=('Shukla ' if index<=15 else 'Krishna ')+name
     if title=='Nakshatra':name += ' · pada '+str(result[1])
     values.append([title,name,index,*list(times)])
    values.append(['Vedic weekday',utils.DAYS_LIST[drik.vaara(jd,place)],'Sunrise boundary','',''])
    for title,fn in [('Sunrise',drik.sunrise),('Sunset',drik.sunset)]:
     result=fn(jd,place);values.append([title,result[1],'',result[0],''])
    return values
   section('Birth Panchanga · local hours may exceed 24', ['Limb','Name','Index','Start/local hour','End/local hour'],panchanga_rows)
   section('Vimsopaka Bala · selected ayanamsa',['Scheme','Planet','Count','Vargas','Weighted score'],lambda:[[scheme,PLANETS[int(k)],*v] for scheme,fn in [('6 vargas',charts.vimsopaka_shadvarga_of_planets),('7 vargas',charts.vimsopaka_sapthavarga_of_planets),('10 vargas',charts.vimsopaka_dhasavarga_of_planets),('16 vargas',charts.vimsopaka_shodhasavarga_of_planets)] for k,v in fn(jd,place).items()])
   def states():
    labels=['Infant','Youth','Adult','Old','Dead'];rows=[]
    for i,(sign,degree) in pp[1:8]:
     segment=min(4,int(degree//6));state=labels[segment if sign%2==0 else 4-segment];rows.append([PLANETS[i],astro.SIGNS[sign],round(degree,6),state])
    return rows
   section('Baladi planetary states · five age states, not lifespan',['Planet','Sign','Degree','State'],states)
   def periods(raw,signs=False):
    rows=[]
    for lords,start,duration in raw:
     names=[(utils.RAASI_LIST[int(v)] if signs else utils.PLANET_NAMES[int(v)]) if settings['language']!='en' else (astro.SIGNS[int(v)] if signs else PLANETS[int(v)]) for v in lords]
     y,m,d,h=start;start_time=datetime(int(y),int(m),int(d))+timedelta(hours=float(h));rows.append([' / '.join(names),start_time.isoformat(),float(duration)])
    return rows
   depth=settings['depth']
   section('Vimshottari · PyJHora year convention',['Lords','Local start','Duration in years'],lambda:periods(vimsottari.get_vimsottari_dhasa_bhukthi(jd,place,dhasa_level_index=depth)[1]))
   section('Yogini',['Lords','Local start','Duration in years'],lambda:periods(yogini.get_dhasa_bhukthi(dob,tob,place,dhasa_level_index=depth,round_duration=False)))
   section('Kalachakra',['Signs','Local start','Duration in years'],lambda:periods(kalachakra.get_dhasa_bhukthi(dob,tob,place,dhasa_level_index=depth,round_duration=False),True))
   section('Narayana',['Signs','Local start','Duration in years'],lambda:periods(narayana.narayana_dhasa_for_rasi_chart(dob,tob,place,dhasa_level_index=depth,round_duration=False),True))
   section('Arudha Padas · selected division',['Pada','Sign'],lambda:[[('AL' if i==0 else 'UL' if i==11 else 'A'+str(i+1)),astro.SIGNS[int(v)]] for i,v in enumerate(arudhas.bhava_arudhas_from_planet_positions(selected_pp))])
   section('Chara Karakas · eight-karaka convention',['Role','Planet'],lambda:[[role,PLANETS[int(v)]] for role,v in zip(['Atma','Amatya','Bhratri','Matri','Pitri','Putra','Jnati','Dara'],house.chara_karakas(pp))])
   section('Special Lagnas · D1',['Lagna','Sign','Degree'],lambda:[[name,astro.SIGNS[int(value[0])],float(value[1])] for name,fn in [('Bhava',drik.bhava_lagna),('Hora',drik.hora_lagna),('Ghati',drik.ghati_lagna),('Pranapada',drik.pranapada_lagna),('Indu',drik.indu_lagna),('Kunda',drik.kunda_lagna),('Bhrigu bindu',drik.bhrigu_bindhu_lagna),('Sree',drik.sree_lagna)] for value in [fn(jd,place)]])
   chart1d=utils.get_house_planet_list_from_planet_positions(selected_pp)
   section('Graha aspects · selected division',['Planet','Aspected signs','Aspected houses','Aspected planets'],lambda:[[PLANETS[i],[astro.SIGNS[s] for s in value[0].get(i,[])],[h+1 for h in value[1].get(i,[])],[PLANETS[q] for q in value[2].get(i,[]) if isinstance(q,int) and q<9]] for value in [house.graha_drishti_from_chart(chart1d)] for i in range(9)])
   checks=[]
   old_custom=const.TREAT_STANDARD_CHART_AS_CUSTOM
   const.TREAT_STANDARD_CHART_AS_CUSTOM=settings['custom']
   for key,(name,rule,*_) in yoga.get_yoga_resources('en').items():
    fn=getattr(yoga,key+'_from_jd_place',None)
    try:checks.append({'name':name,'rule':rule,'status':'present' if fn and fn(jd,place,n) else 'absent' if fn else 'not_evaluated'})
    except Exception:checks.append({'name':name,'rule':rule,'status':'not_evaluated'})
   const.TREAT_STANDARD_CHART_AS_CUSTOM=old_custom
   section(f'Yoga checks · D{n} · {len(checks)} rules · '+str(sum(r['status']=='present' for r in checks))+' present · '+str(sum(r['status']=='absent' for r in checks))+' absent · '+str(sum(r['status']=='not_evaluated' for r in checks))+' unevaluated',['Name','Status','Rule'],lambda:[[r['name'],r['status'],r['rule']] for r in checks if r['status']!='absent'])
   annual=None
   def annual_rows():
    nonlocal annual
    result= tajaka.annual_chart(jd,place,years=settings['year']-dob[0]+1)
    annual=position_chart(result[0],1,chart['profile'],f"Tajaka solar return · {settings['year']}")
    for field,years in [('period_start',settings['year']-dob[0]+1),('period_end',settings['year']-dob[0]+2)]:
     return_jd=drik.next_solar_date(jd,place,years=years)
     y,m,d,hour=utils.jd_to_gregorian(return_jd)
     local_fixed=datetime(y,m,d,tzinfo=timezone(timedelta(hours=place.timezone)))+timedelta(hours=hour)
     annual[field]=local_fixed.astimezone(zone).isoformat()
    annual['reference_timezone']=p['timezone']
    annual['reading']=annual_reading(annual,chart['charts']['1'])
    annual['calculation_location']={'latitude':p['latitude'],'longitude':p['longitude'],'label':p['label'],'timezone':p['timezone']}
    annual['location_convention']='Solar return calculated at the recorded birthplace.'
    return [['Return local date/time',result[1]],['Reference place',p['label']]]
   section('Tajaka annual solar return',['Field','Value'],annual_rows)
   section('Tithi Pravesha · local return times',['Date','Start hour','End hour','Lunar description'],lambda:vratha.tithi_pravesha(drik.Date(*dob),tob,place,settings['year']))
   bav,sav,_=ashtakavarga.get_ashtaka_varga(utils.get_house_planet_list_from_planet_positions(pp))
   section('D1 BAV / SAV · selected ayanamsa',['Contributor',*astro.SIGNS],lambda:[[PLANETS[i] if i<7 else 'Ascendant',*row] for i,row in enumerate(bav)]+[['SAV',*sav]])
   drik.set_ayanamsa_mode(settings['ayanamsa'])
   calendar=[];first=datetime.fromisoformat(chart['generated_at']).astimezone(timezone.utc)
   for month in range(12):
    year=first.year+(first.month-1+month)//12;mo=(first.month-1+month)%12+1;moment=first if month==0 else datetime(year,mo,1,tzinfo=timezone.utc)
    jul=astro.swe.julday(moment.year,moment.month,moment.day,moment.hour+moment.minute/60+moment.second/3600)
    for i in range(7):
     body=[astro.swe.SUN,astro.swe.MOON,astro.swe.MARS,astro.swe.MERCURY,astro.swe.JUPITER,astro.swe.VENUS,astro.swe.SATURN][i];values,_=astro.swe.calc_ut(jul,body,drik.PLANET_FLAGS);sign=int(values[0]//30)
     calendar.append({'date':moment.isoformat(),'planet':PLANETS[i],'sign':astro.SIGNS[sign],'degree':values[0]%30,'retrograde':values[3]<0,'natal_house':(sign-int(pp[0][1][0]))%12+1,'bav':bav[i][sign],'sav':sav[sign]})
   utc_jd=jd-place.timezone/24
   cusps,axes=astro.swe.houses_ex(utc_jd,p['latitude'],p['longitude'],settings['houses'].encode(),astro.swe.FLG_SIDEREAL)
   section('House cusps · selected house system',['House','Sign','Degree'],lambda:[[i+1,astro.SIGNS[int(v//30)],v%30] for i,v in enumerate(cusps)])
   return {'settings':settings,'engine':'PyJHora 4.8.7 / Swiss Ephemeris','predefined':all_charts,'selected':selected,'annual':annual,'sections':sections,'transit_calendar':calendar,'limitations':['Independent agreement with JHora desktop has not been verified.','Predefined vargas use PyJHora method 1; custom divisions use cyclic mapping. These can differ from the main chart conventions.','Planet houses in vargas are whole sign. The selected house system affects the separate cusp table.','Monthly transit samples do not describe every ingress or continuous support. BAV/SAV are traditional points, not probabilities.','Shadbala and reductions remain in the main assessment under its Lahiri convention; this panel adds Vimsopaka and selected-ayanamsa BAV/SAV.','Dasha start times use the birth location historical UTC offset; durations use the package default year convention, distinct from the main 365.25-day timeline.','Report names support English, Hindi, Tamil, Telugu, Kannada and Malayalam. UI headings and some rule descriptions remain English.']}
  finally:
   const.TREAT_STANDARD_CHART_AS_CUSTOM=original_custom
   drik.set_ayanamsa_mode('LAHIRI');astro.swe.set_sid_mode(astro.swe.SIDM_LAHIRI);utils.set_language('en')

def chakra_report(chart,settings):
 """Render package widgets from package-calculated coordinates in isolation."""
 import subprocess,sys,json,os
 from pathlib import Path
 # Reuse the configured calculation method without changing the stored D1.
 report=calculate(chart,settings)
 selected=report['selected'];natal=report['predefined'][0]
 positions=[['L',[selected['ascendant_index'],selected['ascendant_degree']]]]+[[PLANETS.index(p['name']),[p['sign_index'],p['degree']]] for p in selected['planets']]
 from jhora.panchanga import drik
 reference=selected['planets'][0]['longitude'] if settings['division']==1 else selected['ascendant_index']*30+selected['ascendant_degree']
 moon=next(p for p in natal['planets'] if p['name']=='Moon')
 star,pada,_=drik.nakshatra_pada(moon['longitude'])
 birth_retro=[PLANETS.index(p['name']) for p in chart['planets'] if p['retrograde']]
 payload={'positions':positions,'retrograde':birth_retro,'base_star':drik.nakshatra_pada(reference)[0],'birth_star':star,'birth_pada':pada,'language':settings['language']}
 process=subprocess.run([sys.executable,str(Path(__file__).with_name('chakra_renderer.py'))],input=json.dumps(payload),text=True,capture_output=True,timeout=45,env=dict(os.environ,QT_QPA_PLATFORM='offscreen'))
 if process.returncode:raise ValueError('PyJHora chakra renderer failed. Check PyQt6 installation.')
 chakras=json.loads(process.stdout)
 references=[]
 for name,sign in [('Lagna',selected['ascendant_index']),('Moon',selected['planets'][1]['sign_index']),('Sun',selected['planets'][0]['sign_index'])]:
  c=copy.deepcopy(selected);c['label']='Sudarshana · '+name+' reference';c['ascendant_index']=sign;c['ascendant']=astro.SIGNS[sign]
  for p in c['planets']:p['house']=(p['sign_index']-sign)%12+1
  if name!='Lagna':c['ascendant_degree']=next(p['degree'] for p in selected['planets'] if p['name']==name)
  c['summary']=name+' reference: houses counted from '+c['ascendant']+'. Planetary signs and degrees remain those of the selected package chart.'
  references.append(c)
 chakras.append({'id':'sudarshana','name':'Sudarshana Chakra · Lagna / Moon / Sun','status':'calculated','charts':references})
 return {'division':settings['division'],'chakras':chakras,'source':'Installed PyJHora 4.8.7 chakra widgets; Sudarshana shown as three reference charts.','birthplace':chart['profile']['place']}

def chakra_chart_at(chart,settings,moment):
 from jhora import utils
 from jhora.panchanga import drik
 from jhora.horoscope.chart import charts
 instant=datetime.fromisoformat(moment.replace('Z','+00:00'))
 if instant.tzinfo is None:raise ValueError('Select a UTC date and time.')
 if not 1901<=instant.year<=2100:raise ValueError('Date must be within 1901–2100.')
 p=chart['profile']['place'];local=instant.astimezone(ZoneInfo(p['timezone']))
 place=drik.Place('Birth locality',p['latitude'],p['longitude'],local.utcoffset().total_seconds()/3600,elevation=0)
 jd=utils.julian_day_number((local.year,local.month,local.day),(local.hour,local.minute,local.second))
 with astro.LOCK,contextlib.redirect_stdout(io.StringIO()):
  try:
   drik.set_ayanamsa_mode(settings['ayanamsa']);utils.set_language(settings['language'])
   result=position_chart(charts.rasi_chart(jd,place),1,chart['profile'],'Current sky · D1')
   result['as_of']=instant.astimezone(timezone.utc).isoformat()
   result['retrograde_ids']=drik.planets_in_retrograde(jd,place)
   return result
  finally:
   drik.set_ayanamsa_mode('LAHIRI');astro.swe.set_sid_mode(astro.swe.SIDM_LAHIRI);utils.set_language('en')
