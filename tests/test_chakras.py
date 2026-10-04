import unittest,base64,json
from datetime import datetime,timezone
import astro,places,jhora_features
class ChakraTests(unittest.TestCase):
 def test_package_renderers_and_reference_houses(self):
  chart=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},datetime(2026,10,3,tzinfo=timezone.utc))
  before=json.dumps(chart,sort_keys=True)
  result=jhora_features.chakra_report(chart,jhora_features.options({},chart))
  self.assertEqual(len(result['chakras']),11)
  self.assertTrue(all(c['status']=='calculated' for c in result['chakras']))
  for c in result['chakras'][:10]:self.assertTrue(base64.b64decode(c['image'].split(',')[1]).startswith(b'\x89PNG\r\n\x1a\n'))
  references=result['chakras'][-1]['charts']
  for c,name in zip(references,['Lagna','Moon','Sun']):
   if name!='Lagna':self.assertEqual(next(p['house'] for p in c['planets'] if p['name']==name),1)
   self.assertEqual([p['longitude'] for p in c['planets']],[p['longitude'] for p in references[0]['planets']])
  self.assertEqual(json.dumps(chart,sort_keys=True),before)
