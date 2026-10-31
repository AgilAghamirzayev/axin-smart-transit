# Yoxlama qeydi

31 oktyabr 2026 · Windows 11 · Java 21.0.13 · Node 24.22 · Maven 3.9.11.

| Yoxlama | Nəticə |
|---|---|
| Maven verify, H2 integration + unit | **30 test keçdi**, 0 failure/error |
| OfficialGeometry | 4 test: açıq hissə dönüşü, ayrı hissəyə ETA yoxdur, geri hərəkət ETA, real GPS üçün süni qayıdış yoxdur |
| OfficialNetwork integration | 5 test: saylar/variantlar, uyğunluqların sərhədləri, 540 avtobus/270 hissə, statik/canlı API ayrılması, uyğunluğu olmayan dayanacaq |
| Python importer | **4 test keçdi**: quoted multiline, təkrar ID, decimal koordinatlar, validation və sadələşdirmə |
| AnomalyPolicy | 4 test: başlanğıc, 599/600 saniyə, reset, uzun fasilə |
| CrowdingPolicy | 5 test: unknown, duplicate, latest vote, quorum, ratio |
| RouteGeometry | 4 test: loop, keçilmiş stop, projection, stopped fallback |
| MockMvc + DB integration | 8 test: filtering, report persistence/idempotency/cooldown, stale GPS, auth roles, GPS validation/order, alert lifecycle, report TTL, timestamp replay |
| Vitest / Testing Library | **13 test keçdi**, o cümlədən 4 polyline motion və 5 məkan keyfiyyəti testi |
| Playwright / Edge, real lokal backend | **9 E2E test keçdi** (8 ilk icrada; qatın görünüş keçidi düzəldildikdən sonra qalan tab testi ayrıca keçdi) |
| Azərbaycan xəritəsi və birləşmiş seçim | Standart Open Data tabı, qatın gizlənməsi/bərpası, marşrutun qorunması; combobox yazaraq axtarış, boş nəticə, klaviatura seçimi və route reset |
| Maus və mövqe | Wheel zoom, drag, CSS transform regression; test geolocation (40.379,49.848, ±12m), izləmənin dayandırılması və permission denied |
| Frontend ESLint | Keçdi |
| Next.js production build + TypeScript | Keçdi |
| Maven Wrapper | Maven 3.9.11 / Java 21 ilə yoxlandı |
| H2 fayl persistence | V3→V4 migration və backend restartdan sonra ilkin D3 report-u eyni ID ilə geri oxundu; tarixçə qorundu |
| Import təkrarlanması | Keşlənmiş mənbələrdən eyni immutable v1 JSON yenidən yaradıldı |
| Kataloq sıxılması | Restartdan sonra HTTP 200, Content-Encoding gzip; sıxılmış cavab 1298367 bayt |
| Demo generator | Rəsmi 5 nömrəli xəttdən avtomatik avtobus seçərək 3 sintetik HIGH report saxladı |
| Brauzer vizual baxış | Sərnişin xəritəsi, route/stop/ETA və operator paneli yoxlandı |
| Mobil E2E | 390×844-də horizontal overflow yoxdur; seçimlər işləyir |

E2E: sərnişin rəsmi 5 nömrəli route/stop seçir, dəyişən GPS koordinatı yoxlanır, report real backend-ə yazılır və növbəti refresh-də görünür; səhv/düz operator girişi, marşrut axtarışı və logout; mobil seçim; backend failure mesajı; mənbə dialoqu və statik kataloqun təkrar polling edilməməsi. Development StrictMode ilkin sorğunu abort edib yenidən başlada bilər; test uğurlu yüklənmədən sonrakı sorğu sayının dəyişmədiyini yoxlayır.

Persistence yoxlaması DB timestamp mikro­saniyə yuvarlaqlaşdırmasını aşkarladı. Yeni report vaxtı mikro­saniyəyə normallaşdırılır, ilk cavab və idempotent replay JSON bərabərliyi ayrıca regression testi ilə yoxlanır.

## İcra edilməyən yoxlamalar

- Bu kompüterdə Docker yoxdur: Docker image build/Compose startup və real PostgreSQL integration burada işə salınmayıb. CI PostgreSQL service və eyni integration suite üçün hazırlanıb; CI nəticəsi hələ mövcud deyil.
- Production load, penetration test, real GPS hardware, küçə səviyyəli ETA accuracy və real nəqliyyat idarəsinin inteqrasiyası aparılmayıb.
- Default 10 dəqiqəlik alert qaydası virtual Clock ilə deterministik testdə yoxlanıb; real vaxtda 10 dəqiqəlik münsif nümayişini demo-high-load skripti təmin edir.

Yoxlama zamanı Windows MSIX/JDK AF_UNIX pipe xətası prosesə aid TCP fallback ilə həll edildi. Windows start-backend.ps1 bu düzəlişi daşıyır; sistemin təhlükəsizlik ayarları dəyişdirilməyib.

Rəsmi şəbəkə ekranları: [Sərnişin](screenshots/official-passenger.jpg), [Operator](screenshots/official-operator.jpg).

Maus idarəsi və məsafə üzrə animasiya düzəlişi: [Xəritə](screenshots/map-motion.jpg). Məkan sınağı süni test koordinatları ilə aparılıb; istifadəçinin faktiki məkanı götürülməyib. Backend Maven verify, frontend lint/build və 8 unit test bu dəyişikliklə yenidən keçdi.

## Səfər, GPS iştirakı və dispetçer — 31.10.2026

- Maven verify: 42 test, 0 failure/error, build success. GPS razılığı/yaxınlığı, təkrar timestamp, TTL, sıxlıq hədləri, avtobus göndərişi auth/idempotency/cooldown, səfər zaman ardıcıllığı və keçilmiş avtobus halları yoxlandı.
- Frontend: 13 unit test, ESLint, TypeScript və Next production build keçdi.
- Brauzer: 12 ssenarinin hamısı keçdi (ilk tam icrada 11; wheel zoom animasiyası bitməmiş drag başladılan testə 400ms animasiya gözləməsi əlavə edildikdən sonra qalan xəritə ssenarisi ayrıca keçdi).
- Yeni E2E: səfər nəticəsi və dəyişən seçimdə yenidən hesablama, GPS razılıq/start/end, M8 xəttinə bir real DB göndərişi və park sayının +1 artması, mövqe klikində eyni zoom miqyası.
- Sınaqda bir əlavə M8 SIMULATED avtobus lokal parkda və audit tarixçəsində saxlanıldı. Məkan testi süni koordinatlarla aparıldı.
- Lokal səfər API smoke sorğusu: HTTP 200, 5 variant; ölçülən bir sorğu 81ms (yük/performans zəmanəti deyil).
- Yeni sərnişin ekranı vizual baxışdan keçirildi: screenshots/journey-planner.jpg.
- Real sərnişin sayı, real trafik üzrə ETA səhvi, fiziki dispatch və PostgreSQL/Docker bu mərhələdə yoxlanılmayıb. Məhdudiyyətlər JOURNEY_ETA_AND_OPERATIONS.md-dədir.

## Təyinat əsaslı kompakt UX — yekun yoxlama

- Backend Maven verify: 42 test, 0 failure/error. Başlanğıc dayanacağının saxlanması, qənaət seçimində minik sayı sıralaması və istiqamətli minmə/düşmə progress-i də yoxlandı.
- Frontend: 16 unit test; yeni testlər yaxın dayanacaq seçimi və səfər polylines-ının irəli/geri istiqamətdə kəsilməsini əhatə edir. ESLint, TypeScript və son production build keçdi.
- 13 E2E ssenarisi yekunda keçdi: production tam icrasında 10; SVG className və axtarışın variant ID-si ilə nömrəni qarışdırması düzəldildikdən sonra qalan 3 ayrıca keçdi. Son CSS sıxılma düzəlişindən sonra GPS→yaxın dayanacaq→səfər xəritəsi ssenarisi, kartın daxili mətninin kəsilməməsi assertion-u ilə yenidən keçdi.
- Browser GPS yalnız test koordinatları ilə yoxlandı. Zabrat dairəsi → Nərimanov vizual nümunəsində, simulyasiyanın həmin anında 189 → 11 (Koroğlu üzərindən) və birbaşa M8 variantları hesablandı. Bunlar canlı rəsmi xidmət/cədvəl zəmanəti deyil.
- Lokal frontend development reload dövrü səbəbilə standalone production kimi işləyir: scripts/start-frontend-production.ps1. Frontend 127.0.0.1:3000, backend 8080. Test göndərişləri M8 simulyasiya parkında və audit tarixçəsində saxlanılıb.
- Qənaət meyarı az minik sayıdır; təsdiqli tarif məbləği hesablanmır. Bir aktarma, 800m son piyada və 250m aktarma yaxınlığı sərhədləri qüvvədədir.
## Tam trayektoriyaya konkret avtobus təyinatı — yekun yoxlama

- Backend Maven verify: 46 test, 0 failure/error. Tam xətt həndəsəsi, əlaqəsiz hissələr, koordinat boşluğu, başqa xəttin avtobusu, səhv trayektoriya, natamam sorğu, auth, idempotency və cooldown yoxlandı.
- Frontend: 16 unit test, ESLint, TypeScript və production build keçdi.
- Dəyişikliklə əlaqəli 3 operator E2E testi keçdi: giriş, M8 xəttinə seçilmiş ehtiyat avtobusunun təyinatı və park sayının artması, əlaqəsiz həndəsənin bloklanması və mobil enin daşmaması.
- V6 miqrasiyası lokal bazaya tətbiq edildi; əvvəlki avtobuslar və göndəriş tarixçəsi saxlanıldı. Sınaq təyinatı M8 parkında və audit tarixçəsindədir.
- Vizual yoxlama: [Avtobus təyinatı](screenshots/operator-assignment.png). Backend 8080 və frontend 3000 lokal işləyir.
- AYNA məlumatı xətt həndəsəsini verir. Ehtiyat avtobusların xəttə uyğunluğu lokal simulyasiya bölgüsüdür; rəsmi nəqliyyat vasitəsi icazə reyestri yoxlanmayıb.

Məkan/piyada düzəlişi: GPS timeout/unavailable icazə xətasından ayrıldı, şəbəkə mövqeyi fallback əlavə edildi. Birbaşa məsafə 1 km-dən az olduqda yalnız piyada; son 1 km üçün əlavə aktarma verilmir. Frontend production build və backend compile/start tamamlandı. İstifadəçinin sürət tələbinə əsasən testlər işlədilmədi; faktiki cihaz GPS-i yoxlanılmadı.

Tövsiyə etiketləri: üç meyarın nəticələri vahid siyahıda birləşdirilir, eyni səfərlər təkrarlanmır. Mövcud olduqda bir aktarmalı variant ilk nəticələrdə saxlanılır. 1 km-dən qısa səfərdə piyada qaydası qalır. Qənaət az minik sayıdır; UNKNOWN sıxlıqda az sıxlıq etiketi verilmir. Frontend build və backend compile/start tamamlandı; istifadəçinin sürət istəyinə əsasən testlər işlədilmədi.

Son tövsiyə qaydası: əvvəlki məcburi aktarmalı alternativ ləğv edildi. Başlanğıcdan 800m daxilində bütün xidmət edilən dayanacaqlar yoxlanılır; nəticələr minimum minik sayına süzülür. Birbaşa variant varsa aktarmalı nəticə göstərilmir. Maksimum 3 kart, meyarlar etiket şəklindədir. Frontend build/backend compile tamamlandı; testlər istifadəçi istəyinə əsasən işlədilmədi.

## Trayektoriya / istiqamət düzəlişi

Backend compile/start tamamlandı. Lokal API-də Elmlər → Gənclik və əks istiqamət yoxlandı. 3 nömrəli xətt: əvvəl 13089.790 → 30026.006 (16.94km), sonra 24670.604 → 30026.006 (5.36km). Avtobusda təxminən 46.2 dəqiqə əvəzinə 14.6 dəqiqə; düzgün istiqaməti gözləmə ayrıca hesablanır. Əks istiqamət 6860.818 → 13089.790 (6.23km). 17 nömrəli xəttin bu istiqamətdə gedişi 5.37km oldu. Müddətlər sorğu anındakı simulyasiya sürətinə bağlıdır.

Təkrarlanan dayanacaq keçidi, terminalda dönmə qadağası və dönüşün son terminalı üçün 3 regression test yazıldı və kompilyasiya edildi. Əvvəlki sürət/testləri skip etmək istəyinə uyğun test suite işlədilmədi. Real GPS/cədvəl və küçədə fiziki doğrulama aparılmayıb.

## ETA cəmi və bərabər çatma variantları

Bərabər ümumi çatma vaxtında daha az avtobusda gediş, sonra daha az piyada vaxtı seçilir; aktarma üçün Pareto seçimində də eyni qayda tətbiq edilir. Bu, yaxın dayanacaqlar arasında əvvəlki əks istiqamətdə minməklə artıq yol getməyi seçən bərabərlik halını aradan qaldırır.

Vaxtlar saniyə sərhədlərində hesablanır: wait=ceil(board)-ceil(ready), ride=ceil(alight)-ceil(board). İkinci minik birinci düşmənin tam saniyəsindən hesablanır. total=walking+sum(wait)+sum(ride)+60*transfers. Frontend ümumi vaxtı və bütün tərkib hissələrini ayrı göstərir; dəqiqəyə yuxarı yuvarlaqlaşdırma ayrıca izah edilir.

Lokal API nümunəsi (süni başlanğıc 40.371,49.815 → Gənclik): 17 xətti 5.27km / 862s gediş, 446s piyada, 1902s gözləmə, cəm 3210s. 3 və M2 nəticələrində də saniyə cəmləri bərabərdir. Nəticələr həmin andakı simulyasiyaya aiddir. Frontend production build və backend compile/start keçdi; test suite işlədilmədi.

Simulyasiya parkı intervala görə artırıldı: lokal snapshot 4211 avtobus; 3 xətti 17, 17 xətti 16, 33 xətti 15 avtobus. Gənclik istiqamətində nümunə sorğusunda gözləmə 3 xətti üçün 1.4 dəq., 17 üçün 5.2 dəq.; ümumi vaxt müvafiq 18.8/26.4 dəq. API 1.14s (tək sorğu, yük zəmanəti deyil). Backend compile/start keçdi, suite işlədilmədi.

## Google Maps üslubunda interfeys yenilənməsi

Sərnişin ekranı xəritə + ayrıca sürüşən axtarış paneli quruluşuna keçirildi. Səfər/avtobus tabları komponentləri unmount etmir; seçimlər saxlanılır. Route/stop combobox, GPS, səfər variantları, xəritə qatları, report/presence və operator əməliyyatları mövcud API-ləri istifadə edir. Mənbələr və statistika panelin aşağısında saxlanılır. Mobil görünüşdə xəritə yuxarıda, panel aşağıdadır. Operator ekranı eyni naviqasiya, rəng və kart sistemini istifadə edir.

İstinad: https://support.google.com/maps?hl=en (axtarış, istiqamətlər, qatlar). Google-un daxili UI kodu/SDK-sı köçürülməyib; mövcud shadcn, Lucide və Leaflet ilə vizual yanaşma tətbiq edilib.

Production build və TypeScript keçdi. Brauzerdə Elmlər → Gənclik axtarışı, nəticə/xəritə, Səfər/Avtobuslar tabı və 390px mobil görünüş yoxlandı. Mobil document width/content width 375/375 — üfüqi daşma yoxdur. Avtobus tabında GPS iştirakı və sıxlıq bildirişi düymələri əlçatandır. Avtomatlaşdırılmış test suite əvvəlki skip istəyinə uyğun işlədilməyib.

Yekun vizual sübutlar: screenshots/maps-redesign-desktop.png və screenshots/maps-redesign-mobile.png. Operator girişi və təyinat paneli də brauzerdə açıldı; əməliyyat göndərilmədi. Son CSS düzəlişindən sonra production build/TypeScript yenidən keçdi.

## Combobox komponent düzəlişi

Ümumi input CSS-i InputGroup-un daxili input-undan ayrıldı. Sərhəd/fokus yalnız qrupda idarə edilir; daxili input min-width:0 və flex-basis:0 ilə addon-a yer saxlayır. Route/Stop dropdown-ları useComboboxAnchor ilə bütöv sahəyə bağlandı. Portal z-index xəritə qatlarından yuxarıdır; uzun etiketlər sətirə bölünür, popup siyahısı mövcud hündürlüyə uyğun sürüşür. Səfər/avtobus tablarında roving tabIndex əlavə edildi.

Production build/TypeScript keçdi. Brauzerdə fokus, ArrowDown/Enter seçimi, clear düyməsi, M8 axtarışı yoxlandı. Mobil ölçüdə groupWidth=popupWidth=333px, document/content width=375px. Sübut: screenshots/combobox-fixed.png. Avtomatik test suite işlədilmədi.
