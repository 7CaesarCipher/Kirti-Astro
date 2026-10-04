import unittest
from datetime import datetime,timezone
import astro,places,assessment

class ReportDataTests(unittest.TestCase):
 def test_tropical_positions_are_package_calculated(self):
  c=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},datetime(2026,10,3,tzinfo=timezone.utc))
  date=datetime.fromisoformat(c['birth_utc']);jd=astro.swe.julday(date.year,date.month,date.day,date.hour+date.minute/60)
  bodies={'Sun':0,'Moon':1,'Mercury':2,'Venus':3,'Mars':4,'Jupiter':5,'Saturn':6,'Rahu':astro.swe.MEAN_NODE}
  tropical={p['name']:p for p in c['tropical_planets']}
  self.assertEqual(len(tropical),9)
  for name,body in bodies.items():
   values,_=astro.swe.calc_ut(jd,body,astro.swe.FLG_MOSEPH|astro.swe.FLG_SPEED)
   self.assertAlmostEqual(tropical[name]['longitude'],values[0],places=8)
   self.assertTrue(0<=tropical[name]['degree']<30)
  self.assertAlmostEqual((tropical['Ketu']['longitude']-tropical['Rahu']['longitude'])%360,180)
  self.assertEqual(next(p['sign'] for p in c['planets'] if p['name']=='Sun'),'Virgo')
  self.assertEqual(tropical['Sun']['sign'],'Libra')
 def test_bhava_boundaries_assign_all_stored_planets_once(self):
  c=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},datetime(2026,10,3,tzinfo=timezone.utc))
  original=[dict(p) for p in c['planets']]
  data=assessment.calculate(c)['bhava_chalit']
  self.assertEqual(data['status'],'calculated')
  self.assertEqual(len(data['houses']),12)
  for p in c['planets']:
   assignments=[row for row in data['houses'] if ((p['longitude']-row[1][0])%360)<((row[1][2]-row[1][0])%360)]
   self.assertEqual(len(assignments),1)
  self.assertEqual(c['planets'],original)
