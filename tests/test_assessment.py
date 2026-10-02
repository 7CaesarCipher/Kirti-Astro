import unittest
from datetime import datetime,timezone
from unittest.mock import patch
import astro,places,assessment

class AssessmentTests(unittest.TestCase):
 def test_complete_components_points_and_position_agreement(self):
  chart=astro.calculate({'name':'Test','date':'1989-10-15','time':'20:30','place':places.LOCAL.copy()},datetime(2026,9,30,tzinfo=timezone.utc))
  with patch('requests.get',side_effect=AssertionError('Assessment must stay offline')):
   data=assessment.calculate(chart)
  self.assertLess(data['position_agreement_max_degrees'],0.01)
  self.assertEqual(len(data['shadbala']['planets']),7)
  for row in data['shadbala']['planets']:
   parts=row['components_virupas']
   self.assertEqual(set(parts),{'sthana','kala','dig','cheshta','naisargika','drik'})
   self.assertAlmostEqual(row['total_virupas'],sum(parts.values()),places=2)
   self.assertTrue(0<=parts['dig']<=60 and 0<=parts['cheshta']<=60)
  av=data['ashtakavarga']
  self.assertEqual([sum(av['bav'][p]) for p in assessment.NAMES],[48,49,39,54,56,52,39])
  self.assertEqual(av['sav_total'],337)
  self.assertEqual(av['sav'],[sum(av['bav'][p][s] for p in assessment.NAMES) for s in range(12)])
  for row in av['pindas']:self.assertEqual(row['shodhya_pinda'],row['rasi_pinda']+row['graha_pinda'])
  yoga=data['yogas'];self.assertEqual(len(yoga['checks']),yoga['catalogue_size'])
  self.assertTrue(all(r['status'] in ['present','absent','not_evaluated'] for r in yoga['checks']))
  self.assertEqual(assessment.angular_distance(359,1),2)
