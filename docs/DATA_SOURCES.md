# Rəsmi məlumatlar və emal qaydası

İnteqrasiya tarixi: 31 oktyabr 2026. Snapshot: `opendata-2026-10-31-v1`.

## Azərbaycan xəritəsi (standart tab)

[ETSN — Azərbaycanın rayonları](https://opendata.az/@azerbaycan-respublikasinin-ekologiya-ve-tebii-servetler-nazirliyi/azerbaycanin-rayonlari) dataset-indən 86 Polygon/MultiPolygon obyekti və [şəhərlər/inzibati ərazi vahidləri](https://opendata.az/@azerbaycan-respublikasinin-ekologiya-ve-tebii-servetler-nazirliyi/azerbaycanin-seherleri-ve-inzibati-erazi-vahidleri) dataset-indən 4589 Point idxal edilib. Mənbə: ETSN / REİS, opendata.az; lisenziya metadata-sı Creative Commons Attribution (CC BY), hər iki resurs 22 iyul 2025-də yenilənib.

`Azərbaycan · Open Data` standart görünüşü bu rəsmi coğrafi qatı OSM küçə fonunun üzərində göstərir. `Küçə · OpenStreetMap` tabı yalnız küçə fonunu göstərir; nəqliyyat markerləri və istifadəçi mövqeyi hər iki tabda saxlanır. Bu dataset tam küçə tile serveri deyil və OSM fonu Azərbaycan dövlət xəritəsi kimi təqdim edilmir. Ölkə görünüşü üçün ayrıca “Azərbaycanı göstər” düyməsi var.

`python scripts/import_geography.py` metadata/raw faylları `.tools/opendata`-da keşləyir, `frontend/public/data/azerbaijan-geography-v1.json` yaradır. Bütün poliqon halqaları və adaları saxlanır; koordinatlar yalnız 6 onluğa yuvarlaqlaşdırılır (~0.1m). Checksum, mənbə URL, lisenziya və yenilənmə tarixləri JSON-da saxlanır. Brauzer faylı bir dəfə yükləyir; görünən məntəqə markerləri miqyas və viewport-a görə maksimum 100 ilə məhdudlaşdırılır.

| Mənbə | İstifadə | Resursun yenilənməsi | Lisenziya metadata-sı |
|---|---|---|---|
| [AYNA — Avtobusların hərəkət trayektoriyası](https://opendata.az/@azerbaycan-yerustu-neqliyyat-agentliyi/avtobuslarin-hereket-trayektoriyasi) | buslines.kmz: nömrələr və real xətt həndəsəsi | 2026-09-23 | CCZero |
| [BakuBus marşrutları üzrə dayanacaqlar](https://opendata.az/@baki-metropoliteni/bakubus-mmc-ye-mexsus-avtobus-marsrutlari-uzre-dayanacaqlarin-cografi-koordinatlari) | dayanacaqlar.csv: adlar və koordinatlar | 2026-10-28 | License not specified |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Fon xəritəsi; attribution UI-də | Xarici tile xidməti | OSM attribution |

Dayanacaq dataset-i üçün ayrıca açıq lisenziya göstərilmir; AYNA-nın CCZero statusu bu fayla şamil edilmir. Mənbə/tarix/lisenziya tətbiqdə “Mənbələr” dialoqunda görünür. Yenilənmə tarixi məlumatın bu günkü əməliyyat vəziyyətinə zəmanət deyil.

## Faktiki məzmun

- KMZ: 243 Placemark, **239 fərqli nömrə**, **270 LineString**, 396168 ilkin koordinat. Eyni nömrəli variantlar ayrı stabil ID ilə qorunur. KML-də dayanacaq Point elementləri yoxdur.
- RDP ilə 5m tolerantlıqda 40953 koordinata sadələşdirmə. Hər LineString ayrıca saxlanır; ayrı hissələrə süni birləşdirici xətt çəkilmir. Yalnız ucları 1m-dən yaxın olan hissə qapalı sayılır.
- CSV: **3600 düzgün parse edilmiş qeyd**. Quoted mətn daxilində yeni sətirlər olduğundan sadə fayl sətiri sayı qeydlərin sayı deyil. Əvvəlki 3610 sətirlik ilkin baxış əvəzinə burada CSV parser nəticəsi istifadə olunur.
- CSV başlığında iki ID sütunu var. Eyni source ID fərqli koordinatlarla gələ bildiyi üçün daxili ID source ID + koordinat hash-dən yaradılır; adların eyni olması qeydləri silmir.
- Faktiki koordinatlar decimal degrees-dir; metadata təsvirinə əsasən onları 1 milyona bölmək səhv olardı. Lat/lon sərhədləri yoxlanır.

## Dayanacaq əlaqələrinin məhdudiyyəti

Bu iki fayl rəsmi route–stop xidmət/ardıcıllıq cədvəli vermir. Dayanacaqlar hər ayrı polyline-a proyeksiya edilir; **35m** məsafədə olanlar namizəd uyğunluq sayılır. 3551 dayanacağın ən azı bir uyğunluğu var, 49 dayanacaq yalnız global kataloqda görünür. Eyni hissədə uzaq aralıqlı təkrar keçidlər saxlanır.

Yaxınlıq həmin avtobusun dayanacaqda dayanmasını, yolun düzgün tərəfini, gediş/gəliş istiqamətini və ya rəsmi xidmət sırasını təsdiqləmir. Xəritə, seçim və ETA bunu açıq bildirir. Etibarlı əməliyyat sistemi üçün səlahiyyətli GTFS stop_times/trips/direction əlaqəsi lazımdır.

## GPS və ETA

Hər hissədə iki, cəmi **540 sintetik avtobus** hər 3 saniyədə backend-də hərəkət edir. Açıq hissələrdə irəli–geri simulyasiya, qapalı hissələrdə dövrə işləyir. Bu hərəkət modeli rəsmi istiqamət/cədvəl deyil. Canlı AYNA/BakuBus GPS axını inteqrasiya edilməyib.

ETA namizəd dayanacağın həmin hissədəki proyeksiyasına qədər məsafə/sürət əsasında hesablanır. Ayrı hissədəki dayanacağa ETA verilmir. Real GPS API açıq hissə üçün irəli istiqamət fərz edir, keçilmiş nöqtəyə null verir. Sürət <3 km/saat olduqda 18 km/saat fallback; stale GPS üçün null. Yol tıxacı/dwell/cədvəl modeli yoxdur.

## Təkrar idxal və audit

`scripts/import_open_data.py` Python standard library ilə CKAN metadata-sından mənbələri endirir, `.tools/opendata` altında keşləyir və versiyalanmış JSON yaradır. KML daxilindəki description/HTML/XSL icra edilmir. Flyway `V4__Import_official_network` bundled JSON-u DB-yə idxal edir. Normal startup internetdən asılı deyil.

Mövcud snapshot dəyişdirilə bilməz: importer fərqli məzmunla overwrite əməliyyatını rədd edir. Yeni məlumat üçün `--refresh --output <yeni-fayl>` işlədin, metadata versiyasını yeniləyin və ayrıca migration yazın. Deploy edilmiş V4 və v1 resursunu dəyişməyin. İlkin D1–D3 fixture və əvvəlki report tarixçəsi DB-də saxlanır, rəsmi görünüşə daxil edilmir.

SHA-256:

```text
buslines.kmz
28d64329c4cb5716aaab038d4b474e9596899dd126eaa2af83021bfb2efd5d12

dayanacaqlar.csv
baa7734fd720e56d1f4a6d8144917be90a265de38d94fc17f49b72c98e15319b
```

Resource URL-lər, checksum-lar və mənbə metadata-sı bundled JSON və `/api/transit/network` daxilində də saxlanılır.
