"""Import official ETSN geography from CKAN; local public assets need no live API."""
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.tools/opendata'
OUTPUT = ROOT / 'frontend/public/data/azerbaijan-geography-v1.json'
SLUGS = ['azerbaycanin-rayonlari', 'azerbaycanin-seherleri-ve-inzibati-erazi-vahidleri']

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    collections, sources = [], []
    for slug in SLUGS:
        meta_file, data_file = CACHE / (slug+'-metadata.json'), CACHE / (slug+'.geojson')
        if not meta_file.exists():
            meta = json.load(urllib.request.urlopen('https://admin.opendata.az/api/3/action/package_show?id='+slug))['result']
            meta_file.write_text(json.dumps(meta), encoding='utf-8')
        meta = json.loads(meta_file.read_text(encoding='utf-8'))
        resource = meta['resources'][0]
        if not data_file.exists():
            data_file.write_bytes(urllib.request.urlopen(resource['url']).read())
        raw = data_file.read_bytes()
        data = json.loads(raw)
        # Preserve all rings, islands and original geometry. Round only to ~0.1m.
        def coordinates(value):
            if isinstance(value[0], (float,int)):
                lon,lat=value[:2]
                if not (44 <= lon <= 52 and 38 <= lat <= 42):
                    raise ValueError('Coordinates outside expected region')
                return [round(lon,6),round(lat,6)]
            return [coordinates(v) for v in value]
        features=[]
        for f in data['features']:
            p=f['properties'];g=f['geometry']
            features.append({'type':'Feature','properties':{'name':p.get('Name_AZ') or p.get('NAME_AZ') or p.get('NAME'), 'kind':p.get('TYPE_AZ','rayon')},
                             'geometry':{'type':g['type'],'coordinates':coordinates(g['coordinates'])}})
        collections.append({'type':'FeatureCollection','features':features})
        sources.append({'title':meta['title'],'url':'https://opendata.az/@'+meta['organization']['name']+'/'+slug,
                        'license':meta['license_title'],'updatedAt':resource.get('last_modified'),
                        'downloadUrl':resource['url'],'sha256':hashlib.sha256(raw).hexdigest()})
    result={'sources':sources,'districts':collections[0],'places':collections[1]}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('District features:',len(collections[0]['features']),'Places:',len(collections[1]['features']),'Bytes:',OUTPUT.stat().st_size)

if __name__=='__main__':main()
