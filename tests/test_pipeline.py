import unittest,sys,tempfile,json,hashlib,threading,urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pipeline as p
from research_server import Handler,ThreadingHTTPServer
class PipelineTests(unittest.TestCase):
 def test_integrity(self):self.assertEqual(p.validate()['status'],'passed')
 def test_source_isolation_and_context(self):
  for sid,q in [('brihat_jataka','wealth'),('brihat_samhita','Jupiter'),('sepharial','houses'),('tetrabiblos','marriage')]:
   hits=p.search(q,sid,3,False);self.assertTrue(hits)
   for h in hits:self.assertEqual(h['source_id'],sid);self.assertTrue(p.context(h['chunk_id'])['parent']['text'])
 def test_review_hash_gate(self):
  original=p.reviews
  try:
   p.reviews=lambda:{};self.assertEqual(p.search('wealth','brihat_jataka'),[])
   hit=p.search('wealth','brihat_jataka',1,False)[0]
   p.reviews=lambda:{hit['chunk_id']:{'text_sha256':hashlib.sha256(hit['text'].encode()).hexdigest()}}
   self.assertEqual(p.search('wealth','brihat_jataka')[0]['chunk_id'],hit['chunk_id'])
   p.reviews=lambda:{hit['chunk_id']:{'text_sha256':'outdated'}};self.assertEqual(p.search('wealth','brihat_jataka'),[])
  finally:p.reviews=original
 def test_http_chat(self):
  s=ThreadingHTTPServer(('127.0.0.1',0),Handler);t=threading.Thread(target=s.serve_forever,daemon=True);t.start();base='http://127.0.0.1:'+str(s.server_port)
  try:
   self.assertIn(b'Kirti Astro',urllib.request.urlopen(base).read())
   payload={'question':'wealth','source':'brihat_jataka','research':True};req=urllib.request.Request(base+'/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
   response=json.load(urllib.request.urlopen(req));self.assertTrue(response['evidence']);self.assertEqual(response['mode'],'evidence_only')
  finally:s.shutdown();s.server_close()
if __name__=='__main__':unittest.main()
