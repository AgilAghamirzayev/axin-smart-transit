import unittest
from import_open_data import parse_stops, simplify, haversine, build

class ImportTests(unittest.TestCase):
    def test_csv_quotes_newlines_duplicate_ids_and_decimal_units(self):
        content='ID,AD,ID,LONGITUDE,LATITUDE,Tip\n1,"School, north\\nentrance",123,49.85,40.38,\n2,Other,123,49.86,40.39,\n'.replace('\\n','\n').encode('utf-8-sig')
        stops,count=parse_stops(content)
        self.assertEqual(count,2)
        self.assertEqual(len(stops),2)
        self.assertNotEqual(stops[0]['id'],stops[1]['id'])
        self.assertEqual(stops[0]['latitude'],40.38)
    def test_exact_duplicate_identity_and_coordinate_deduplicates(self):
        content=b'ID,AD,ID,LONGITUDE,LATITUDE,Tip\n1,A,123,49.85,40.38,\n2,A,123,49.85,40.38,\n'
        self.assertEqual(len(parse_stops(content)[0]),1)
    def test_invalid_coordinate_units_fail_instead_of_silent_corruption(self):
        with self.assertRaises(ValueError):
            parse_stops(b'ID,AD,ID,LONGITUDE,LATITUDE,Tip\n1,A,1,49850000,40380000,\n')
    def test_simplification_keeps_endpoints_and_turns(self):
        points=[(40.38,49.84),(40.38,49.84001),(40.38,49.85),(40.39,49.85)]
        result=simplify(points)
        self.assertEqual(result[0],points[0])
        self.assertEqual(result[-1],points[-1])
        self.assertIn(points[2],result)
        self.assertLess(len(result),len(points))

if __name__=='__main__':
    unittest.main()
