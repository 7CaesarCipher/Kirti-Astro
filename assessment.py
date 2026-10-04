"""Pinned PyJHora calculations and local corpus provenance. AGPL-3.0-or-later."""
import contextlib,copy,importlib.metadata,io,json,math
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import astro,pipeline
NAMES=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']
ROOT=Path(__file__).resolve().parent

def angular_distance(a,b):
    return abs((a-b+180)%360-180)

def corpus_candidates(query,limit=2):
    # Research passages may support review, never silently become approved rules.
    return [{'chunk_id':h['chunk_id'],'source_id':h['source_id'],'locator':h['locator'],'approved':h['approved'],'excerpt':h['text'][:1800]} for h in pipeline.search(query,'brihat_jataka',limit,False)]

def calculate(chart):
    with astro.LOCK,contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
        from jhora import const,utils
        from jhora.panchanga import drik
        from jhora.horoscope.chart import strength,ashtakavarga,charts,yoga
        const.use_internet_for_location_check=False
        const.check_database_for_world_cities=False
        const.set_node_mode(False)
        const.get_place_elevation_from_internet=False
        drik._sidereal_planet_list={body:identifier for body,identifier in zip([const._SUN,const._MOON,const._MARS,const._MERCURY,const._JUPITER,const._VENUS,const._SATURN,const._RAHU,const._KETU],range(9))}
        drik.planet_list=drik._sidereal_planet_list.copy()
        drik.set_ayanamsa_mode('LAHIRI')
        drik.PLANET_FLAGS=astro.swe.FLG_MOSEPH|astro.swe.FLG_SIDEREAL|astro.swe.FLG_SPEED
        birth=datetime.fromisoformat(chart['birth_utc'])
        local=birth.astimezone(ZoneInfo(chart['profile']['place']['timezone']))
        offset=local.utcoffset().total_seconds()/3600
        p=chart['profile']['place']
        place=drik.Place('Birth locality',p['latitude'],p['longitude'],offset,elevation=0.0)
        jd=utils.julian_day_number((local.year,local.month,local.day),(local.hour,local.minute,local.second))
        pp=charts.rasi_chart(jd,place)
        natal={p['name']:p for p in chart['planets']}
        all_names=NAMES+['Rahu','Ketu']
        mismatch={name:angular_distance(pp[i+1][1][0]*30+pp[i+1][1][1],natal[name]['longitude']) for i,name in enumerate(all_names)}
        if max(mismatch.values())>0.01:raise ValueError('Strength engine positions differ from the displayed birth chart')
        parts={
            'sthana':strength._sthana_bala(jd,place),
            'kala':strength._kaala_bala(jd,place),
            'dig':strength._dig_bala(jd,place,method=2),
            'cheshta':[],
            'naisargika':strength._naisargika_bala(jd,place),
            'drik':strength._drik_bala(jd,place),
        }
        # Epoch-table mean positions with circular averaging and shortest distance.
        sun_mean=strength.get_planet_mean_longitude(jd,place,const._SUN)
        for i in range(7):
            if i<2:parts['cheshta'].append(0.0);continue
            mean=strength.get_planet_mean_longitude_using_epoch_table(jd,place,i)%360
            seegrocha=sun_mean
            if i in [3,5]:seegrocha,mean=mean,sun_mean
            true=pp[i+1][1][0]*30+pp[i+1][1][1]
            average=(mean+((true-mean+180)%360-180)/2)%360
            parts['cheshta'].append(round(angular_distance(seegrocha,average)/3,2))
        rows=[]
        for i,name in enumerate(NAMES):
            components={key:round(float(values[i]),2) for key,values in parts.items()}
            if not all(math.isfinite(v) for v in components.values()):raise ValueError('Non-finite strength result')
            if not 0<=components['dig']<=60 or not 0<=components['cheshta']<=60:raise ValueError('Invalid bounded strength component')
            total=round(sum(components.values()),2)
            rows.append({'planet':name,'components_virupas':components,'total_virupas':total,'total_rupas':round(total/60,4)})
        # Use stored natal signs, not a separate birth-position calculation.
        chart1d=['' for _ in range(12)]
        for i,name in enumerate(NAMES):chart1d[natal[name]['sign_index']]+=str(i)+'/'
        chart1d[chart['charts']['1']['ascendant_index']]+='L/'
        input_chart=chart1d.copy()
        for i,name in [(7,'Rahu'),(8,'Ketu')]:input_chart[natal[name]['sign_index']]+=str(i)+'/'
        bav,sav,prastara=ashtakavarga.get_ashtaka_varga(input_chart)
        trikona=ashtakavarga._trikona_sodhana(copy.deepcopy(bav))
        reduced=ashtakavarga._ekadhipatya_sodhana(copy.deepcopy(trikona),chart1d)
        pindas=[]
        for i,name in enumerate(NAMES):
            rasi=sum(reduced[i][r]*const.ashtakavarga_rasimana_multipliers[r] for r in range(12))
            graha=sum(const.ashtakavarga_grahamana_multipliers[j]*reduced[i][natal[other]['sign_index']] for j,other in enumerate(NAMES))
            pindas.append({'planet':name,'rasi_pinda':int(rasi),'graha_pinda':int(graha),'shodhya_pinda':int(rasi+graha)})
        resources=yoga.get_yoga_resources('en')
        checked=[]
        for key,details in resources.items():
            fn=getattr(yoga,key+'_from_jd_place',None)
            try:
                if fn is None:raise ValueError('No calculator for rule')
                present=bool(fn(jd,place,1))
                checked.append({'id':key,'name':details[0],'rule':details[1],'status':'present' if present else 'absent'})
            except Exception as error:
                checked.append({'id':key,'name':details[0],'rule':details[1],'status':'not_evaluated','reason':type(error).__name__})
        try:bhava={'status':'calculated','method':'KN Rao / equal houses centred on the ascendant','houses':charts.bhava_chart(jd,place,bhava_madhya_method=1)}
        except Exception as error:bhava={'status':'not_calculated','reason':type(error).__name__}
        astro.swe.set_sid_mode(astro.swe.SIDM_LAHIRI)
    present=[row for row in checked if row['status']=='present']
    # Exact name/rule searches are review aids, not evidence of expert approval.
    for row in present:
        row['corpus_candidates']=corpus_candidates(row['name'])
    return {'bhava_chalit':bhava,'engine':'PyJHora','version':importlib.metadata.version('PyJHora'),
            'shadbala':{'planets':rows,'component_order':list(parts),'units':'virupas; 60 virupas = 1 rupa','minimum_ratios':'Not assigned: threshold conventions differ; raw component totals are displayed.',
                        'method':'Lahiri; library Sthana/Kala/Naisargika/Drik; Dig method 2; epoch-table Cheshta with circular averaging; Sun/Moon Cheshta zero under this convention'},
            'ashtakavarga':{'signs':astro.SIGNS,'bav':{name:bav[i] for i,name in enumerate(NAMES+['Ascendant'])},'sav':sav,'prastara':prastara,'trikona_reduced':trikona,'ekadhipatya_reduced':reduced,'pindas':pindas,'sav_total':sum(sav),'occupancy_convention':'Seven classical planets and ascendant; nodes excluded; SAV excludes ascendant BAV'},
            'yogas':{'chart':'D1','catalogue_size':len(resources),'checks':checked,'present_count':len(present),'not_evaluated_count':sum(row['status']=='not_evaluated' for row in checked),'scope':'All 284 rules shipped in pinned PyJHora catalogue; not every yoga in every tradition. Failed rules are explicitly unevaluated. No claimed benefits are generated.'},
            'position_agreement_max_degrees':max(mismatch.values()),
            'corpus':{'source_id':'brihat_jataka','strength_candidates':corpus_candidates('strength sthana dik kala cheshta',4),'ashtakavarga_candidates':corpus_candidates('Ashtakavarga',3),'policy':'Research OCR excerpts with locators; unchanged approved passages alone can support consumer interpretation. No auto-approval.'},
            'limitations':['Calculations have not been independently compared with a second strength engine.','Six Shadbala categories are calculated under the stated convention; there is no universal yoga catalogue.','A yoga presence check or strength total does not guarantee an event, marriage or wealth.','Higher-latitude/date edge cases and historical sunrise conventions need further validation.']}

def explain(chart,topics):
    data=chart.get('assessment')
    if not data:return 'Planetary assessment is not available in this session. Generate a new reading.'
    lines=[]
    if 'strength' in topics:
        lines.append('Shadbala: all six categories are computed for seven classical planets under the stated method. 60 virupas = 1 rupa. Nodes are excluded; totals are not probabilities.')
        for row in data['shadbala']['planets']:
            lines.append(row['planet']+': '+', '.join(f'{key} {value}' for key,value in row['components_virupas'].items())+f"; total {row['total_virupas']} virupas / {row['total_rupas']} rupas.")
        lines.append('Method: '+data['shadbala']['method'])
    if 'ashtakavarga' in topics:
        a=data['ashtakavarga'];lines.append(f"Ashtakavarga: SAV total {a['sav_total']}. "+', '.join(f'{sign} {score}' for sign,score in zip(astro.SIGNS,a['sav']))+'. BAV, contributor tables, both reductions and Shodhya Pindas are in the assessment panel. These are traditional points, not odds of an event.')
    if 'yoga' in topics:
        y=data['yogas'];lines.append(f"D1 yoga checks: {y['catalogue_size']} catalogue rules; {y['present_count']} present; {y['not_evaluated_count']} unevaluated. This is not a catalogue of every yoga in every tradition.")
        for row in y['checks']:
            if row['status']=='present':lines.append(row['name']+': '+row['rule'])
    lines.append('Local corpus research excerpts retain source IDs and locators and are unreviewed unless explicitly approved. No automated approval or promised benefits are inferred.')
    lines.append('These calculation results have not been independently validated against a second engine.')
    return '\n\n'.join(lines)
