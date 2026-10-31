# REST API v1

Base: backend `http://localhost:8080/api`; browser üçün Next.js `http://localhost:3000/api`.
JSON, UTC ISO-8601 timestamps. Browser proxy yalnız aşağıdakı endpoint-ləri ötürür. Cavablar cache edilmir.

| Method/path | Auth | Məqsəd |
|---|---|---|
| GET /transit/network | public | Statik metadata, routes, stops, paths və yaxınlıq uyğunluqları |
| GET /transit/snapshot?routeId=AYNA-00010 | public | Filtered vehicles/ETA və bütün aktiv şəbəkənin route analytics-i; optional stopId |
| POST /reports | public | Sıxlıq report-u |
| GET /operator/snapshot | Basic operator | Transit snapshot + ən son 100 alert |
| POST /operator/alerts/{uuid}/acknowledge | Basic operator | İdempotent acknowledgement |
| PUT /telemetry/vehicles/{id} | Basic gps | Xarici GPS qəbul etmək |
| GET /actuator/health (API base xaricində) | public | UP health |

## Snapshot

`generatedAt`, `simulation`, `anomalyDurationSeconds`, `minimumReporters`, `highRatioThreshold`, `reportFreshnessSeconds`, `gpsFreshnessSeconds`, `vehicles[]`, `analytics[]`.

Kataloq ayrıca `/transit/network` cavabındadır: metadata, routes[], stops[]. Metadata mənbə linki, tarix, SHA-256, lisenziya, saylar və uyğunlaşdırma parametrlərini saxlayır.
Route: id, number, name, color, source, stops[], paths[], stopMatches[]. Path: points[{latitude,longitude}], closed. StopMatch: stopId, pathIndex, progressMeters, distanceMeters. Stop: id, name, latitude, longitude. `stops` yaxınlıq namizədləridir; rəsmi dayanacaq ardıcıllığı deyil.
243 route ID 239 nömrəni təmsil edir; eyni nömrəli variantları ID ilə ayırın. Bütün 3600 dayanacaq global kataloqdadır; 49 dayanacağın yaxın marşrut uyğunluğu yoxdur. Belə stopId üçün snapshot boş vehicles qaytarır. Route+stop uyğun deyilsə 400.
Vehicle: id, routeId, pathIndex, progressMeters, latitude, longitude, speedKmh, observedAt, source (SIMULATED/GPS), stale, crowdLevel, etaMinutes (nullable). `progressMeters` simulyasiyanın path üzrə fazasıdır: qapalı hissədə [0,L), açıq irəli–geri hissədə [0,2L). Frontend ardıcıl ölçmələr arasında bu məsafə ilə polyline boyunca animasiya edir; ekran transformunu CSS ilə animasiya etmir.
Analytics: routeId, level, activeVehicles, totalVehicles, reporters, highReports, highRatio, highSince (nullable), highSeconds.
GPS vəziyyəti source/stale ilə açıqdır; simulation flag simulatorun konfiqurasiya vəziyyətidir. Eyni anda qarışıq GPS mənbələri ola bilər.

## Report

```json
{
  "requestId": "6bd6e10a-294a-4c13-a1aa-aa687f0f58ad",
  "reporterId": "ff430307-2cb2-46db-a0a4-a774520a4b19",
  "vehicleId": "AYNA-00010-P1-1",
  "level": "HIGH"
}
```

LOW / MEDIUM / HIGH qəbul olunur. requestId və reporterId UUID olmalıdır. Server routeId və createdAt-ı özü müəyyən edir. Eyni requestId + eyni payload eyni saved report qaytarır (201); fərqli payload 409. Cooldown bütün avtobuslar üzrə həmin reporter üçün default 30 saniyədir (429). Köhnə GPS 409. UNKNOWN giriş kimi rədd edilir.

## GPS

```json
{
  "latitude": 40.3798,
  "longitude": 49.8484,
  "speedKmh": 24,
  "observedAt": "2026-10-31T08:00:00Z"
}
```

Nümunədəki vaxtı **cari UTC** ilə əvəz edin. İstifadəçi `gps`, şifrə `TELEMETRY_PASSWORD`.
Latitude ±90, longitude ±180, speed 0–120; nullable deyil. Server route progress-i avtobusun təyin olunmuş pathIndex hissəsinə proyeksiya edir. Nümunə koordinatını həmin hissənin real nöqtəsi ilə əvəz edin. Açıq hissədə real GPS üçün irəli istiqamət fərz edilir; keçilmiş dayanacağa ETA null-dır. Trip/direction inteqrasiyası gələcək işdir. Off-route >300m 400; köhnə/çox gələcək timestamp 400; out-of-order 409. Avtobus kataloqda olmalıdır (cari ID-ləri snapshot-dan götürün); olmayan ID 404. Ölçüm qəbul olunduqdan sonra həmin avtobus simulyasiya edilmir.

## Alert

id, routeId, startedAt, triggeredAt, resolvedAt, acknowledgedAt. Son iki timestamp nullable. UI tövsiyəni aktiv alert olduqda göstərir. Ack avtobus dispatch etmir; yalnız operatorun baxdığını qeydə alır.

## HTTP səhvləri

400 validation / qeyri-uyğun route-stop / GPS, 401 giriş yoxdur və ya səhvdir, 403 yanlış rol, 404 tapılmadı, 409 idempotency/GPS conflict, 429 report cooldown. Biznes xətaları RFC ProblemDetail JSON (`status`, `detail`, `title`). Proxy backend-ə qoşula bilmədikdə 503 + detail. Auth error body boş ola bilər, frontend status üçün ayrıca mesaj göstərir.

Səfər planlama, razılıqlı GPS iştirakı və operator göndəriş endpointləri: [genişləndirmə API-si](JOURNEY_ETA_AND_OPERATIONS.md#api).
