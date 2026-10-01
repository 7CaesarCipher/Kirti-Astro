"""Kirti Astro corpus pipeline. Python 3.11+, standard library only."""
from pathlib import Path
import argparse,datetime,hashlib,json,os,sqlite3,subprocess,sys,tempfile,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'corpus'
def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def write(p,obj):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 temp=p.with_suffix(p.suffix+'.tmp');temp.write_text(json.dumps(obj,indent=2,ensure_ascii=False),encoding='utf-8');os.replace(temp,p)
def audit(action,details):
 with (ROOT/'audit.jsonl').open('a',encoding='utf-8') as f:f.write(json.dumps({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'action':action,'details':details})+'\n')
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def collect(force=False):
 manifest=read(ROOT/'sources.json');results=[]
 for source in manifest:
  for item in source['downloads']:
   dest=DATA/'raw'/item['filename'];url=item['url']
   if dest.exists() and not force:results.append({'file':dest.name,'status':'cached','sha256':digest(dest)});continue
   parsed=urllib.parse.urlparse(url)
   if parsed.scheme!='https' or parsed.hostname not in ['archive.org','www.gutenberg.org']:raise ValueError('Source host not approved')
   if Path(item['filename']).name!=item['filename']:raise ValueError('Unsafe filename')
   req=urllib.request.Request(url,headers={'User-Agent':'KirtiAstroCorpus/0.2 (research download)'})
   dest.parent.mkdir(parents=True,exist_ok=True);tmp=dest.with_suffix(dest.suffix+'.part')
   try:
    with urllib.request.urlopen(req,timeout=90) as response,tmp.open('wb') as out:
     size=0
     while block:=response.read(65536):
      size+=len(block)
      if size>40*1024*1024:raise ValueError('Download exceeds 40 MiB limit')
      out.write(block)
    if tmp.stat().st_size<100:raise ValueError('Empty or unexpected download')
    if dest.suffix=='.json':read(tmp)
    elif dest.suffix=='.xml':
     import xml.etree.ElementTree as ET
     ET.parse(tmp)
    else:
     text=tmp.read_text(encoding='utf-8-sig')
     if 'PROJECT GUTENBERG' not in text:raise ValueError('Unexpected text response')
    os.replace(tmp,dest);results.append({'file':dest.name,'url':url,'status':'downloaded','sha256':digest(dest)})
   finally:tmp.unlink(missing_ok=True)
 write(DATA/'metadata/download_report.json',results);audit('collect',results);return results
def build():
 subprocess.run([sys.executable,str(DATA/'scripts/build.py')],check=True)
 audit('build',{'chunks_sha256':digest(DATA/'chunks.jsonl')});return validate()
def chunks():return [json.loads(x) for x in (DATA/'chunks.jsonl').read_text(encoding='utf-8').splitlines()]
def reviews():return read(ROOT/'reviews.json') if (ROOT/'reviews.json').exists() else {}
def approve(cid,reviewer,note):
 match=next((c for c in chunks() if c['chunk_id']==cid),None)
 if not match:raise ValueError('Unknown chunk')
 if not reviewer.strip() or not note.strip():raise ValueError('Reviewer and review note required')
 r=reviews();r[cid]={'reviewer':reviewer,'note':note,'text_sha256':hashlib.sha256(match['text'].encode()).hexdigest(),'approved_at':datetime.datetime.now(datetime.timezone.utc).isoformat()};write(ROOT/'reviews.json',r);audit('approve',{'chunk':cid,'reviewer':reviewer})
def search(query,source=None,limit=5,approved_only=True):
 if not query.strip():return []
 # Quote terms so ordinary questions cannot inject FTS syntax.
 import re
 terms=re.findall(r'\w+',query.lower());stop={'what','is','the','a','my','about','how','and','of','to','for','in'}
 terms=[t for t in terms if t not in stop]
 if not terms:return []
 fts=' OR '.join('"'+t+'"' for t in terms[:30]);c=sqlite3.connect(DATA/'research_index.sqlite');c.row_factory=sqlite3.Row
 sql='SELECT *,bm25(passages) AS score FROM passages WHERE passages MATCH ? AND length(text)>=200';args=[fts]
 if source:sql+=' AND source_id=?';args.append(source)
 sql+=' ORDER BY score';rows=c.execute(sql,args).fetchall();c.close();r=reviews();out=[]
 for row in rows:
  d=dict(row);rev=r.get(d['chunk_id']);approved=bool(rev and rev['text_sha256']==hashlib.sha256(d['text'].encode()).hexdigest())
  if approved_only and not approved:continue
  d['approved']=approved;out.append(d)
  if len(out)>=limit:break
 return out
def context(cid):
 c=next((c for c in chunks() if c['chunk_id']==cid),None)
 if not c:raise ValueError('Unknown chunk')
 for line in (DATA/'clean'/f"{c['source_id']}.jsonl").read_text(encoding='utf-8').splitlines():
  p=json.loads(line)
  if p['unit_id']==c['parent_id']:return {'chunk':c,'parent':p,'source':next(s for s in read(DATA/'metadata/sources.json') if s['id']==c['source_id'])}
 raise ValueError('Missing parent')
def validate():
 cs=chunks();ids=[c['chunk_id'] for c in cs];assert len(ids)==len(set(ids));assert all(c['text'].strip() for c in cs)
 for sid in {c['source_id'] for c in cs}:
  parents={json.loads(l)['unit_id'] for l in (DATA/'clean'/f'{sid}.jsonl').read_text(encoding='utf-8').splitlines()}
  assert all(c['parent_id'] in parents for c in cs if c['source_id']==sid)
 conn=sqlite3.connect(DATA/'research_index.sqlite');assert conn.execute('pragma integrity_check').fetchone()[0]=='ok';assert conn.execute('select count(*) from passages').fetchone()[0]==len(cs);conn.close()
 result={'status':'passed','chunks':len(cs),'sources':len({c['source_id'] for c in cs}),'approved_reviews':len(reviews())};write(DATA/'metadata/validation.json',result);return result
def export_approved():
 r=reviews();selected=[c for c in chunks() if c['chunk_id'] in r and r[c['chunk_id']]['text_sha256']==hashlib.sha256(c['text'].encode()).hexdigest()]
 dest=ROOT/'exports';dest.mkdir(exist_ok=True)
 with (dest/'approved.jsonl').open('w',encoding='utf-8') as f:
  for c in selected:f.write(json.dumps(dict(c,production_approved=True,review=r[c['chunk_id']]),ensure_ascii=False)+'\n')
 return {'exported':len(selected),'path':str(dest/'approved.jsonl')}
def ollama(path,payload):
 base=os.environ.get('OLLAMA_URL','http://localhost:11434').rstrip('/')
 req=urllib.request.Request(base+path,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=180) as res:return json.load(res)
def ollama_stream(payload):
 base=os.environ.get('OLLAMA_URL','http://localhost:11434').rstrip('/')
 req=urllib.request.Request(base+'/api/chat',data=json.dumps(dict(payload,stream=True)).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=180) as res:
  for line in res:
   if not line.strip():continue
   event=json.loads(line)
   if event.get('error'):raise ValueError('Local model generation failed')
   delta=event.get('message',{}).get('content','')
   if delta:yield delta
   if event.get('done'):break

def embed(model):
 exported=export_approved();lines=Path(exported['path']).read_text().splitlines();records=[]
 for line in lines:
  c=json.loads(line);res=ollama('/api/embed',{'model':model,'input':c['text']});records.append({'chunk_id':c['chunk_id'],'text_sha256':hashlib.sha256(c['text'].encode()).hexdigest(),'embedding':res['embeddings'][0]})
 write(ROOT/'exports/embeddings.json',{'model':model,'records':records});return {'embedded':len(records),'model':model}
def main():
 p=argparse.ArgumentParser();sub=p.add_subparsers(dest='cmd',required=True)
 c=sub.add_parser('collect');c.add_argument('--force',action='store_true')
 for name in ['build','validate','export']:sub.add_parser(name)
 s=sub.add_parser('search');s.add_argument('query');s.add_argument('--source');s.add_argument('--research',action='store_true');s.add_argument('--limit',type=int,default=5)
 a=sub.add_parser('approve');a.add_argument('chunk_id');a.add_argument('--reviewer',required=True);a.add_argument('--note',required=True)
 c=sub.add_parser('context');c.add_argument('chunk_id')
 e=sub.add_parser('embed');e.add_argument('--model',required=True)
 a=p.parse_args()
 if a.cmd=='collect':result=collect(a.force)
 elif a.cmd=='build':result=build()
 elif a.cmd=='validate':result=validate()
 elif a.cmd=='search':result=search(a.query,a.source,max(1,min(a.limit,20)),not a.research)
 elif a.cmd=='approve':result=approve(a.chunk_id,a.reviewer,a.note)
 elif a.cmd=='context':result=context(a.chunk_id)
 elif a.cmd=='export':result=export_approved()
 else:result=embed(a.model)
 print(json.dumps(result,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
