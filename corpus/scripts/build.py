
from pathlib import Path
import json,re,hashlib,sqlite3,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
sources=[
 dict(id='brihat_jataka',title='The Brihat Jataka',author='Varahamihira',translator='N. Chidambaram Aiyar',edition='1905, second edition',tradition='indian_classical_jataka',url='https://archive.org/details/brihatjataka00varaiala',rights_url='https://commons.wikimedia.org/wiki/File:The_Brihat_jataka_(IA_brihatjataka00varaiala).pdf',rights='Host marks public domain in USA; source-country clearance not established by that tag',kind='ocr'),
 dict(id='brihat_samhita',title='The Brihat Samhita',author='Varahamihira',translator='N. Chidambaram Iyer',edition='1884–1885 composite scan, includes Hindu Zodiac appendix',tradition='indian_classical_samhita',url='https://archive.org/details/b29353130',rights_url='https://commons.wikimedia.org/wiki/File:The_Bṛihat_saṃhitâ_of_Varaha_Mihira_(IA_b29353130).pdf',rights='Host marks Public Domain Mark, PD-old-100-expired',kind='ocr'),
 dict(id='sepharial',title='Astrology: How to Make and Read Your Own Horoscope',author='Sepharial',translator=None,edition='1920 edition per transcription note; Gutenberg 46963',tradition='western_modern_historical',url='https://www.gutenberg.org/ebooks/46963',rights_url='https://www.gutenberg.org/ebooks/46963',rights='Public domain in USA per Gutenberg; original Gutenberg license retained in raw file; other jurisdictions require checking',kind='transcription'),
 dict(id='tetrabiblos',title="Ptolemy’s Tetrabiblos",author='Ptolemy; adaptation attributed to Proclus; additional material in edition',translator='J. M. Ashmand',edition='1900 Foulsham edition per Gutenberg 70850',tradition='western_hellenistic',url='https://www.gutenberg.org/ebooks/70850',rights_url='https://www.gutenberg.org/ebooks/70850',rights='Public domain in USA per Gutenberg; original Gutenberg license retained in raw file; other jurisdictions require checking',kind='transcription')]
allchunks=[];stats=[]
for src in sources:
 sid=src['id']; units=[]
 if src['kind']=='ocr':
  raw=ROOT/'raw'/f'{sid}_djvu.xml'
  for i,obj in enumerate(ET.parse(raw).getroot().iter('OBJECT'),1):
   paras=[' '.join(' '.join(w.itertext()).strip() for w in p.iter('WORD')) for p in obj.iter('PARAGRAPH')]
   text='\n\n'.join(p for p in paras if p.strip())
   units.append((f'XML scan page {i} (not printed page)',text,{'scan_page_index':i,'scan_object':obj.get('data')}))
 else:
  raw=ROOT/'raw'/f'{sid}.txt';t=raw.read_text(encoding='utf-8-sig')
  t=re.split(r'\*\*\* START OF .*?\*\*\*',t,maxsplit=1,flags=re.S)[1]
  t=re.split(r'\*\*\* END OF .*?\*\*\*',t,maxsplit=1,flags=re.S)[0]
  # Paragraph anchors refer to this exact downloaded transcription, not fabricated printed pages.
  for i,p in enumerate(re.split(r'\n\s*\n',t),1):
   p=' '.join(p.split())
   if p:units.append((f'Transcription paragraph {i}',p,{'paragraph_index':i}))
 src.update(retrieved_on='2026-09-29',raw_path=str(raw.relative_to(ROOT)),sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),review_status='source_selected_content_not_expert_reviewed',production_approved=False,language='en')
 rows=[]
 for loc,text,anchor in units:
  text=text.replace('\x00','').strip()
  if not text:continue
  uid=f'{sid}-u{len(rows)+1:05}'
  rows.append(dict(unit_id=uid,source_id=sid,locator=loc,text=text,**anchor))
  # Page/paragraph is parent context; windows are candidates, never stand-alone approved rules.
  words=text.split()
  for off in range(0,len(words),320):
   body=' '.join(words[off:off+400]);cid=f'{uid}-w{off:05}'
   flags=['historical_claims_not_scientific_evidence','requires_context_review']
   if src['kind']=='ocr':flags.append('unverified_ocr')
   if re.search(r'\b(death|disease|barren|steril|insan|suicid|caste|slave|sex|criminal)',body,re.I):flags.append('sensitive_historical_content')
   allchunks.append(dict(chunk_id=cid,parent_id=uid,source_id=sid,tradition=src['tradition'],locator=loc,word_offset=off,text=body,source_url=src['url'],quality_flags=flags,production_approved=False))
   if off+400>=len(words):break
 (ROOT/'clean'/f'{sid}.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
 stats.append(dict(source_id=sid,units=len(rows),words=sum(len(r['text'].split()) for r in rows),chunks=sum(c['source_id']==sid for c in allchunks)))
(ROOT/'metadata'/'sources.json').write_text(json.dumps(sources,indent=2,ensure_ascii=False))
(ROOT/'chunks.jsonl').write_text(''.join(json.dumps(c,ensure_ascii=False)+'\n' for c in allchunks))
con=sqlite3.connect(ROOT/'research_index.sqlite')
con.execute('DROP TABLE IF EXISTS passages')
con.execute('CREATE VIRTUAL TABLE passages USING fts5(chunk_id UNINDEXED,source_id UNINDEXED,tradition UNINDEXED,locator UNINDEXED,text)')
con.executemany('INSERT INTO passages VALUES (?,?,?,?,?)',[(c['chunk_id'],c['source_id'],c['tradition'],c['locator'],c['text']) for c in allchunks]);con.commit();con.close()
report=dict(sources=len(sources),chunks=len(allchunks),words=sum(x['words'] for x in stats),production_approved_chunks=0,details=stats)
(ROOT/'metadata'/'quality_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
