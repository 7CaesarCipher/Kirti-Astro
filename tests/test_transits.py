import unittest
from datetime import datetime,timezone
from unittest.mock import patch
import astro,places

class TransitTests(unittest.TestCase):
 def test_all_charts_share_snapshot_and_correct_mapping(self):
  now=datetime(2026,10,2,12,tzinfo=timezone.utc)
  c=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},now)
  original={p['name']:p for p in c['charts']['1']['transit']['planets']}
  for code,chart in c['charts'].items():
   self.assertEqual(chart['transit']['as_of'],now.isoformat())
   self.assertEqual(len(chart['transit']['planets']),9)
   self.assertEqual(len(chart['summary']['placements']),9)
   self.assertIn('D'+code,chart['summary']['text'])
   for p in chart['transit']['planets']:
    self.assertEqual(p['longitude'],original[p['name']]['longitude'])
    self.assertEqual(p['sign_index'],astro.division(p['longitude'],int(code)))
    self.assertEqual(p['house'],(p['sign_index']-chart['ascendant_index'])%12+1)
    self.assertTrue(0<=p['degree']<30)
  self.assertAlmostEqual((original['Ketu']['longitude']-original['Rahu']['longitude'])%360,180)
  with patch.object(astro.swe,'calc_ut',side_effect=AssertionError('Must use cached chart')):
   astro.reading(c,'overview',9)
 def test_timezone_required(self):
  with self.assertRaises(ValueError):astro.attach_transits({},datetime(2026,10,2))

 def test_place_coordinates_preserved_and_chart_summaries_bypass_ai(self):
  import os,server
  c=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},datetime(2026,10,2,tzinfo=timezone.utc))
  with patch.dict(os.environ,{'OLLAMA_MODEL':'test-model'}),patch.object(server.pipeline,'ollama',side_effect=AssertionError('No AI chart readings')),patch.object(server.pipeline,'ollama_stream',side_effect=AssertionError('No AI chart readings')):
   for division in astro.VARGAS:
    selected=c['charts'][str(division)]
    self.assertEqual(selected['birthplace']['latitude'],places.LOCAL['latitude'])
    self.assertEqual(selected['birthplace']['longitude'],places.LOCAL['longitude'])
    self.assertEqual(selected['birthplace']['provider'],places.LOCAL['provider'])
    answer=server.english_answer(c,'overview',[],division=division)
    self.assertEqual(answer['mode'],'calculated')
    self.assertIn('D'+str(division),answer['text'])
