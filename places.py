import json,urllib.request,urllib.parse,hashlib,threading,time
CACHE={};LOCK=threading.Lock()
LOCAL={'id':'local-colonelganj-prayagraj','label':'Colonelganj, Prayagraj (Allahabad), Uttar Pradesh, India','latitude':25.46090,'longitude':81.85639,'timezone':'Asia/Kolkata','provider':'OpenStreetMap locality via Mapcarta','source':'https://mapcarta.com/14893376'}
CACHE[LOCAL['id']]=LOCAL
RESULTS={}
def search(query):
 query=query.strip()
 if len(query)<3:return []
 if len(query)>120:raise ValueError('Place search is too long.')
 key=query.lower()
 if key in RESULTS:return RESULTS[key]
 if 'colonel' in key and any(x in key for x in ['prayag','allahabad']):return [LOCAL]
 url='https://geocoding-api.open-meteo.com/v1/search?'+urllib.parse.urlencode({'name':query,'count':8,'language':'en','format':'json'})
 try:
  with urllib.request.urlopen(url,timeout=12) as r:data=json.load(r)
 except Exception:raise ValueError('Place lookup is unavailable. Check internet access and try again; no location has been guessed.')
 out=[]
 for p in data.get('results',[]):
  if not p.get('timezone'):continue
  item={'id':'om-'+str(p['id']),'label':', '.join(dict.fromkeys(str(p[k]) for k in ['name','admin1','country'] if p.get(k))),'latitude':p['latitude'],'longitude':p['longitude'],'timezone':p['timezone'],'provider':'Open-Meteo / GeoNames','source':'https://open-meteo.com/en/docs/geocoding-api'}
  out.append(item)
 with LOCK:
  if len(CACHE)>2000:CACHE.clear();CACHE[LOCAL['id']]=LOCAL
  for item in out:CACHE[item['id']]=item
  if len(RESULTS)>200:RESULTS.clear()
  RESULTS[key]=out
 return out

def resolve(place_id):
 with LOCK:p=CACHE.get(place_id)
 if not p:raise ValueError('Please search for and select your birthplace again.')
 return p.copy()
