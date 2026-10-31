"""Reproducible, offline-capable AYNA/BakuBus import. Standard library only.

Run: python scripts/import_open_data.py [--refresh]
Generated versioned resource is immutable once its Flyway migration is deployed.
Never execute KML descriptions, HTML, scripts or XSL from the source archive.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.tools' / 'opendata'
OUTPUT = ROOT / 'backend/src/main/resources/network/official-network-v1.json'
NS = {'k': 'http://www.opengis.net/kml/2.2'}
THRESHOLD = 35.0
TOLERANCE = 5.0
CELL = 200.0
X_SCALE = 111320 * math.cos(math.radians(40.4))
Y_SCALE = 111320
SOURCES = {
    'routes': ('avtobuslarin-hereket-trayektoriyasi', 'buslines.kmz'),
    'stops': ('bakubus-mmc-ye-mexsus-avtobus-marsrutlari-uzre-dayanacaqlarin-cografi-koordinatlari', 'dayanacaqlar.csv'),
}


def download(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def source(kind, refresh):
    slug, filename = SOURCES[kind]
    metadata_path = CACHE / (kind + '-metadata.json')
    if refresh or not metadata_path.exists():
        metadata_path.write_bytes(download('https://admin.opendata.az/api/3/action/package_show?id=' + slug))
    package = json.loads(metadata_path.read_bytes())['result']
    resource = package['resources'][0]
    path = CACHE / filename
    if refresh or not path.exists():
        path.write_bytes(download(resource['url']))
    return path.read_bytes(), {
        'title': package['title'], 'url': 'https://opendata.az/@' + package['organization']['name'] + '/' + slug,
        'downloadUrl': resource['url'], 'license': package.get('license_title'),
        'resourceUpdatedAt': resource['last_modified'], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def xy(point):
    return point[1] * X_SCALE, point[0] * Y_SCALE


def projection(point, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    denominator = dx * dx + dy * dy
    t = 0 if denominator == 0 else max(0, min(1, ((point[0]-a[0])*dx + (point[1]-a[1])*dy)/denominator))
    return math.hypot(point[0]-a[0]-t*dx, point[1]-a[1]-t*dy), t


def simplify(points, tolerance=TOLERANCE):
    """Iterative RDP: preserve each LineString's endpoints, never join disconnected paths."""
    if len(points) < 3:
        return points
    projected = [xy(p) for p in points]
    keep = {0, len(points)-1}
    pending = [(0, len(points)-1)]
    while pending:
        start, end = pending.pop()
        if end <= start + 1:
            continue
        distance, index = max((projection(projected[i], projected[start], projected[end])[0], i) for i in range(start+1, end))
        if distance > tolerance:
            keep.add(index)
            pending.extend(((start, index), (index, end)))
    return [points[i] for i in sorted(keep)]


def haversine(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371000 * 2 * math.atan2(math.sqrt(h), math.sqrt(max(0, 1-h)))


def parse_stops(content):
    # The actual CSV has two ID headers. Its values are already decimal degrees,
    # despite the catalogue description saying microdegrees. Validate the values.
    rows = list(csv.reader(io.StringIO(content.decode('utf-8-sig'))))
    unique = {}
    for row in rows[1:]:
        if not row or not any(row):
            continue
        _, name, original_id, lon, lat, *rest = row
        lat, lon = float(lat), float(lon)
        if not 38 <= lat <= 42 or not 44 <= lon <= 52:
            raise ValueError('Unexpected coordinate units or location: ' + str(row))
        key = (original_id.strip(), lat, lon)
        identifier = 'BBS-' + original_id.strip() + '-' + hashlib.sha256(f'{lat},{lon}'.encode()).hexdigest()[:6]
        unique.setdefault(key, {'id': identifier, 'sourceId': original_id.strip(), 'name': name.strip(),
                                'latitude': lat, 'longitude': lon, 'type': rest[0].strip() if rest else ''})
    return list(unique.values()), len(rows)-1


def match_stops(points, stops, grid, path_index):
    matches = {}
    offset = 0
    for a, b in zip(points, points[1:]):
        ax, ay = xy(a)
        bx, by = xy(b)
        length = haversine(a, b)
        if length < 0.001:
            continue
        for gx in range(math.floor((min(ax,bx)-THRESHOLD)/CELL), math.floor((max(ax,bx)+THRESHOLD)/CELL)+1):
            for gy in range(math.floor((min(ay,by)-THRESHOLD)/CELL), math.floor((max(ay,by)+THRESHOLD)/CELL)+1):
                for index in grid.get((gx,gy), []):
                    stop = stops[index]
                    distance, fraction = projection(xy((stop['latitude'],stop['longitude'])), (ax,ay), (bx,by))
                    if distance <= THRESHOLD:
                        candidate = {'stopId': stop['id'], 'pathIndex': path_index,
                                     'progressMeters': round(offset+fraction*length,3), 'distanceMeters': round(distance,2)}
                        # Keep multiple visits on a path when separated by >100 metres.
                        visits = matches.setdefault(stop['id'], [])
                        nearby = next((i for i,v in enumerate(visits) if abs(v['progressMeters']-candidate['progressMeters'])<100), None)
                        if nearby is None:
                            visits.append(candidate)
                        elif candidate['distanceMeters'] < visits[nearby]['distanceMeters']:
                            visits[nearby] = candidate
        offset += length
    return sorted((v for visits in matches.values() for v in visits), key=lambda v:v['progressMeters'])


def build(kmz, csv_bytes, sources):
    stops, source_rows = parse_stops(csv_bytes)
    grid = {}
    for i, stop in enumerate(stops):
        x, y = xy((stop['latitude'], stop['longitude']))
        grid.setdefault((math.floor(x/CELL),math.floor(y/CELL)), []).append(i)
    with zipfile.ZipFile(io.BytesIO(kmz)) as archive:
        xml = ET.fromstring(archive.read('doc.kml'))
    routes = []
    source_points = 0
    colors = ['#6757df','#159889','#d68c27','#3177bf','#b45c8b','#607d39']
    for index, mark in enumerate(xml.findall('.//k:Placemark', NS)):
        number = mark.findtext('k:name', namespaces=NS).strip()
        paths = []
        matches = []
        for line in mark.findall('.//k:LineString', NS):
            raw = []
            for value in line.findtext('k:coordinates', namespaces=NS).split():
                lon,lat,*_ = map(float,value.split(','))
                point = (round(lat,7),round(lon,7))
                if not raw or raw[-1] != point:
                    raw.append(point)
            if len(raw) < 2:
                raise ValueError('Degenerate LineString')
            source_points += len(raw)
            points = simplify(raw)
            # Only genuinely coincident endpoints constitute a loop; no artificial closing chord.
            closed = haversine(points[0], points[-1]) < 1
            if closed:
                points[-1] = points[0]
            matches.extend(match_stops(points, stops, grid, len(paths)))
            paths.append({'points':[{'latitude':p[0],'longitude':p[1]} for p in points], 'closed':closed})
        if not paths:
            raise ValueError('Missing geometry')
        routes.append({'id': 'AYNA-' + mark.attrib.get('id',str(index)).replace('ID_',''),
                       'number':number, 'name':f'{number} nömrəli marşrut', 'color':colors[index%len(colors)],
                       'source':'AYNA', 'paths':paths, 'stopMatches':matches})
    routes.sort(key=lambda r: [(0,int(p)) if p.isdigit() else (1,p) for p in re.split(r'(\d+)',r['number'])])
    used = {m['stopId'] for r in routes for m in r['stopMatches']}
    metadata = {'version':'opendata-2026-10-31-v1','importedAt':'2026-10-31', 'sources':sources,
                'associationMethod':'INFERRED_PROXIMITY','associationThresholdMeters':THRESHOLD,
                'simplificationToleranceMeters':TOLERANCE,'rawStopRows':source_rows,
                'stopCount':len(stops),'matchedStopCount':len(used),'routeCount':len(routes),
                'uniqueRouteNumbers':len({r['number'] for r in routes}),
                'pathCount':sum(len(r['paths']) for r in routes),'sourcePointCount':source_points,
                'pointCount':sum(len(p['points']) for r in routes for p in r['paths'])}
    return {'metadata':metadata,'stops':stops,'routes':routes}


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--refresh', action='store_true')
    options = args.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    kmz, route_source = source('routes', options.refresh)
    csv_bytes, stop_source = source('stops', options.refresh)
    result = build(kmz, csv_bytes, [route_source,stop_source])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    print(json.dumps(result['metadata'],ensure_ascii=True,indent=2))


if __name__ == '__main__':
    main()
