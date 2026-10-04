import unittest,json,os
from datetime import datetime,timezone
from unittest.mock import patch
import astro,places,jhora_features

class JHoraFeaturesTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.profile={'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()}
  cls.now=datetime(2026,10,3,tzinfo=timezone.utc)
  cls.chart=astro.calculate(cls.profile,cls.now)
  with patch('requests.get',side_effect=AssertionError('No online calculation')):
   cls.report=jhora_features.calculate(cls.chart,jhora_features.options({},cls.chart))
 def test_complete_sections_and_predefined_charts(self):
  r=self.report
  self.assertEqual(len(r['predefined']),23)
  self.assertEqual([c['division'] for c in r['predefined']],jhora_features.PREDEFINED)
  self.assertTrue(all(s['status']=='calculated' for s in r['sections']),[(s['name'],s.get('reason')) for s in r['sections']])
  for c in r['predefined']:
   self.assertEqual(len(c['planets']),9)
   self.assertTrue(all(0<=p['degree']<30 and 1<=p['house']<=12 for p in c['planets']))
  json.dumps(r)
  baseline={p['name']:p for p in self.chart['planets']}
  for p in r['predefined'][0]['planets']:
   self.assertLess(abs(p['longitude']-baseline[p['name']]['longitude']),0.01)
  self.assertEqual(len(r['transit_calendar']),84)
  self.assertEqual(sum(next(s for s in r['sections'] if s['name'].startswith('D1 BAV'))['rows'][-1][1:]),337)
 def test_custom_300_settings_and_global_restoration(self):
  options=jhora_features.options({'division':300,'ayanamsa':'RAMAN','houses':'E'},self.chart)
  report=jhora_features.calculate(self.chart,options)
  self.assertEqual(report['selected']['division'],300)
  self.assertTrue(all(0<=p['degree']<30 for p in report['selected']['planets']))
  other=report['predefined'][0]['planets'][0]['longitude']
  original=self.report['predefined'][0]['planets'][0]['longitude']
  self.assertGreater(abs(other-original),0.5)
  after=astro.calculate(self.profile,self.now)
  self.assertEqual(after['planets'],self.chart['planets'])
 def test_option_validation(self):
  for data in [{'division':301},{'division':0},{'division':1.5},{'depth':4},{'ayanamsa':'invented'},{'houses':'invented'},{'language':'invented'},{'year':1988}]:
   with self.assertRaises((ValueError,TypeError)):jhora_features.options(data,self.chart)

 def test_custom_predefined_mapping_and_setting_restoration_on_failure(self):
  from jhora import const
  from jhora.horoscope.chart import yoga
  custom=jhora_features.calculate(self.chart,jhora_features.options({'division':2,'custom':True,'language':'hi','depth':3},self.chart))
  self.assertIn('custom cyclic',custom['selected']['label'])
  self.assertTrue(custom['selected']['planets'][0]['display_name'])
  for planet in custom['selected']['planets']:
   original=next(p for p in self.chart['planets'] if p['name']==planet['name'])
   self.assertEqual(planet['sign_index'],int(original['longitude']*2/30)%12)
  for name in ['Vimshottari','Yogini','Kalachakra','Narayana']:
   self.assertGreater(len(next(s for s in custom['sections'] if s['name'].startswith(name))['rows']),len(next(s for s in self.report['sections'] if s['name'].startswith(name))['rows']))
  original_custom=const.TREAT_STANDARD_CHART_AS_CUSTOM
  with patch.object(yoga,'get_yoga_resources',side_effect=ValueError('Injected resource error')):
   with self.assertRaises(ValueError):jhora_features.calculate(self.chart,jhora_features.options({'custom':True},self.chart))
  self.assertEqual(const.TREAT_STANDARD_CHART_AS_CUSTOM,original_custom)
