# Səfər, ETA, GPS iştirakı və dispetçer

## İstifadə

Sərnişin səhifəsində “Hara gedirsiniz?” bölməsində başlanğıc və təyinatı axtarışdan, xəritədən və ya cari mövqedən seçin. “Marşrut tap” beşədək variant göstərir. Seçim dəyişəndə nəticə köhnəlmiş kimi işarələnir; yenidən hesablayın. “Mənim mövqeyim” xəritəni minimum 16-cı zoom səviyyəsində mərkəzləşdirir; artıq daha yaxın zoom varsa geri uzaqlaşmır.

Səfər nəticəsi dayanacağa piyada vaxtını, avtobus gözləməsini, minmə/gəliş saatını, avtobusda vaxtı və təyinata çatma saatını göstərir. Səfər seçiləndə bütün hissələrin yalnız minmə–düşmə aralığı xəritədə rənglə göstərilir. Tam avtobus xətləri gizlədilir. Təxmini piyada bağlantıları kəsik xətlə çəkilir.

## Axtarış və sıralama

`journey` backend və frontend feature paketləridir. Başlanğıc/təyinatdan 800 metr daxilində ən yaxın səkkiz dayanacaq, birbaşa və ən çox bir aktarma müqayisə edilir. Aktarma eyni dayanacaqda və ya ən çox 250m yaxın digər dayanacaqda, fərqli xəttə mümkündür. Aradakı piyada vaxtı və 60 saniyə keçid ehtiyatı nəzərə alınır; yolun tərəfi, keçid və maneələr təsdiqlənmir. İki saatdan uzun avtobus variantları çıxarılır. Bu, bütün şəhər üçün qeyri-məhdud qlobal optimum deyil, göstərilən axtarış sərhədləri daxilində tövsiyədir.

Piyada vaxtı düz məsafə × 1.25 dolayı yol əmsalı / 1.25 m/s-dir. Piyada küçə şəbəkəsi, maneələr və təhlükəsiz keçidlər hələ inteqrasiya edilməyib. Rəsmi statik xətt həndəsəsi ilə dayanacaq əlaqələri 35m yaxınlıqdan çıxarılıb; rəsmi xidmət/cədvəl təsdiqi deyil. Açıq xəttdə simulyasiya geri qayıdır; bu da rəsmi əks istiqamət cədvəli deyil.

Sıralama balı faktiki vaxt + seçim çəkisidir. Çəki çatma saatını dəyişmir:

| Meyar | LOW / UNKNOWN / MEDIUM / HIGH çəkisi, saniyə ekvivalenti | Aktarma çəkisi |
|---|---|---|
| Ən tez çatma | 0 / 0 / 0 / 0 | 0 |
| Vaxt + rahatlıq | 0 / 120 / 180 / 600 | 120 |
| Daha az sıxlıq | 0 / 240 / 360 / 1200 | 120 |
| Qənaətli | Əvvəl minik sayı, bərabərlikdə ümumi vaxt | Qiymət hesablanmır |

Az sıxlıq meyarında əvvəl sıxlıq/aktarma çəkisi, bərabərlikdə çatma vaxtı sıralanır. Hər aktarma üçün faktiki 60 saniyə minmə ehtiyatı var. Birinci avtobusdan gec düşən sərnişinə artıq getmiş ikinci avtobus tövsiyə edilmir. Pareto seçimində əvvəlki xətt üzrə erkən çatma və aşağı sıxlıq çəkisi saxlanır. Sıxlıq son sərnişin bildirişləri və aktual təsdiqlənmiş GPS iştirakından alınır.

## ETA araşdırması və hazırkı model

[GTFS Schedule](https://gtfs.org/documentation/schedule/reference/) xətt, səfər, dayanacaq vaxtları və həndəsə üçün standartdır. [GTFS Realtime](https://gtfs.org/documentation/realtime/reference/#message-stoptimeevent) dayanacaq üzrə proqnoz gəliş/gediş vaxtını və qeyri-müəyyənliyi daşıyır. Bunlar gələcəkdə etibarlı operator mənbəsindən qəbul edilməli məlumat modelləridir; bu layihə hazırda GTFS feed-i istehlak etmir.

Hazırkı ETA düz xətt məsafəsindən deyil, avtobusun trayektoriya boyunca irəliləyişindən hesablanır: qalan məsafə / sürət. 3km/saatdan aşağı sürətdə 18km/saat ehtiyat qiyməti tətbiq edilir. Simulyasiyada müşahidə vaxtından keçən müddət və dövr/geri dönüş nəzərə alınır; real açıq xətt üçün keçilmiş dayanacağa uydurma növbəti dövr yaradılmır. Köhnə GPS (>60 saniyə) səfər hesabına daxil edilmir.

Təyinata vaxt = başlanğıca piyada + gözləmə + gediş + aktarma/gözləmə (varsa) + son piyada hissə. Trafik, svetofor, dayanacaqda dayanma və faktiki cədvəl yoxdur. Ekrandakı ±max(2 dəq., ümumi vaxtın 20%-i) yalnız heuristik qeyri-müəyyənlik göstəricisidir, ölçülmüş etibar intervalı deyil. Real dəqiqliyi bildirmək üçün faktiki gəlişlərlə MAE/P90 səhvini ayrıca ölçmək lazımdır.

## Razılıqlı GPS iştirakı

`presence` feature-i “Bu avtobusdayam” seçimi və ayrıca razılıqdan sonra işləyir. Xam koordinatlar bazada saxlanmır; sessiya tokeni brauzer yaddaşında, anonim reporter ID-si localStorage-da qalır. Bir reporter yalnız bir aktiv sessiyaya malik olur.

Ölçmə maksimum 15 saniyə köhnə, gələcəyə maksimum 5 saniyə, dəqiqlik ≤35m, avtobusa məsafə ≤75m olmalıdır. Üç uyğun ölçmə ən az 15 saniyəni əhatə etməlidir; fasilə >20 saniyə olarsa ardıcıllıq yenilənir. Təkrar/köhnələnən timestamp qəbul edilmir. Təsdiqlənmiş iştirak 60 saniyə yenilənmədikdə saydan çıxır, sessiya 120 saniyə fəaliyyətsizlikdən sonra bitir, 10 dəqiqədən köhnə qeydlər təmizlənir. İstifadəçi dayandıra bilər; səhifədən çıxışda best-effort end sorğusu, qalan hallarda TTL işləyir.

`NOMINAL_CAPACITY=60` fərz edilən tutumdur, konkret avtobusun təsdiqli tutumu deyil. Təsdiqlənmiş iştirakçı sayı ≥50% olduqda MEDIUM, ≥80% olduqda HIGH hesablanır. Aşağı iştirak sayı UNKNOWN qalır: az tətbiq istifadəçisi boş avtobus demək deyil. GPS və bildiriş səviyyələrinin yuxarısı seçilir. Koordinat yaxınlığı minmənin qəti sübutu deyil; GPS saxtalaşdırılması və çoxsaylı anonim identifikasiya tam aradan qaldırılmayıb. Buna görə göstərici ümumi sərnişin sayı kimi təqdim edilmir.

## Operator və əlavə avtobus

`dispatch` feature-i operator səlahiyyəti ilə seçilmiş ehtiyat SIMULATED avtobusu xəttin yoxlanılmış tam trayektoriyasına təyin edir. Avtobus kataloqdakı başlanğıc nöqtəsindən hərəkət edir; depo çıxışının fiziki modeli yoxdur. Yeni avtobus mövcud həndəsə/simulyatorla hərəkət edir, xəritədə və aktiv park sayında görünür. Fiziki avtobusa əmr göndərilmir. Simulyator söndürüləndə göndəriş rədd edilir.

Əməliyyat və operator adı DB tarixçəsində saxlanır. Request UUID təkrarında ikinci avtobus yaranmır; başqa xətt/hissə ilə həmin UUID 409 qaytarır. Eyni xəttə 30 saniyədən tez təkrar göndəriş 429, hissədə maksimum 30 avtobus limiti var. UI uğursuz sorğunun UUID-sini saxlayır ki, şəbəkə retry-si təhlükəsiz olsun.

Panel bütün xəttlərin aktiv/ümumi parkını, bildirişləri və GPS nümunə sayını göstərir. HIGH vəziyyətlər dərhal paneldə göstərilir; davamlı 10 dəqiqə HIGH əvvəlki anomaliya mexanizmindən xəbərdarlıq yaradır. İstəyə bağlı brauzer bildirişləri icazədən sonra yeni anomaliyalar üçün işləyir. Əlavə boş avtobus dolu avtobusun HIGH göstəricisini dərhal sıfırlamır.

## API

| Metod və yol | Giriş / nəticə |
|---|---|
| POST `/api/journeys/plan` | fromLatitude/fromLongitude/toLatitude/toLongitude, preference: FASTEST/BALANCED/COMFORT → generatedAt, options, limitation |
| POST `/api/presence` | reporterId UUID, vehicleId, consent=true → sessionId |
| POST `/api/presence/{sessionId}/sample` | latitude, longitude, accuracy, observedAt ISO → verified, message |
| POST `/api/presence/{sessionId}/end` | Sessiyanı silir |
| GET `/api/operator/dispatches` | Operator Basic auth; son 50 göndəriş |
| POST `/api/operator/dispatches` | Operator Basic auth; requestId UUID, routeId, trajectoryId, reserveVehicleId → order |

V5 Flyway miqrasiyası `presence_session` və `dispatch_order` cədvəllərini əlavə edir; mövcud report və alert tarixçəsini qoruyur.


## Təyinat əsaslı kompakt UX (son yenilənmə)

Təyinatı seçib “Marşrut tap” basdıqda, başlanğıc yoxdursa məkan icazəsi alınır. ≤100m dəqiqlikli, ≤15 saniyə köhnə ölçmədən, marşrutlarla əlaqəsi olan ən yaxın dayanacaq (≤800m) seçilir. Bu dayanacaq fromStopId ilə sabitlənir, piyada məsafəsi isə faktiki GPS nöqtəsindən hesablanır. İcazə yoxdursa əl ilə və xəritədən seçim qalır. Təyinat seçilən dayanacaq olaraq saxlanır, lakin son 800m piyada gediş lazımsız ikinci avtobusdan daha sürətli ola bilər.

Plan sorğusu optional fromStopId/toStopId qəbul edir. Başlanğıc ID-si minmə dayanacağını sabitləyir; təyinat ID-si yoxlanır, yaxın düşmə dayanacağı və son piyada hissəsi ilə həmin nöqtəyə çatma hesablanır. Leg cavabındakı boardProgress/alightProgress simulyasiya istiqamətini saxlayır. Frontend həndəsəni bu aralıqda kəsir, bütün ara yol təpələrini saxlayır və düz xətt qısayolu çəkmir.

Üç meyar backend-də ayrıca hesablanır, UI-də hazır nəticələr arasında keçilir; hər meyar üzrə ən çox üç fərqli xətt ardıcıllığı göstərilir. Eyni xətt/hissə ardıcıllığının dayanacaq variasiyaları birləşdirilir. Aktiv variantın addımları açıq, digərləri kompakt saxlanır. Xəttin nömrəsi, adı və variant ID-si vahid searchable combobox-da axtarılır. Statistikalar kiçik sətirdə, mənbə təfərrüatları dialoqda, xətt axtarışı açılıb-bağlanan sahədədir.

Tarif araşdırması: AYNA-nın rəsmi Map AYNA açıqlaması platformada tariflərin göstərildiyini təsdiq edir: https://www.ayna.gov.az/az/news/avtobuslarla-bagli-melumatlar-map-aynada-739 . İdxal edilmiş statik kataloq bütün xətlərin aktual tarifini daşımır. Buna görə Qənaətli seçimi az minik sayına əsaslanır; tarif və ən ucuz pul məbləği barədə təsdiqlənməmiş iddia verilmir. Gələcək addım hər xətt/seqment üzrə təsdiqli tarif mənbəyidir.

## Tam trayektoriyaya ehtiyat avtobus təyinatı (V6)

Operator panelində texniki pathIndex / “Hissə” seçimi ləğv edildi. Marşrut searchable seçimdən seçilir, tam kataloq həndəsəsi xəritədə göstərilir. Başlanğıc və son koordinatlar mənbədən götürülür; adlar ən yaxın dayanacaqdan (≤250m) çıxarıldığı üçün “yaxınlığı” kimi yazılır, uyğun ad yoxdursa koordinatlar göstərilir.

GET /api/operator/dispatches/options?routeId=... operator auth tələb edir və serverin trajectory yoxlamasını, bu xəttə ayrılmış ehtiyat avtobusları qaytarır. POST /api/operator/dispatches artıq requestId, routeId, trajectoryId (routeId:FULL), reserveVehicleId tələb edir; pathIndex ilə köhnə natamam sorğu 400 qaytarır.

V6 reserve_bus cədvəlində hər kataloq xəttinə üç sintetik ehtiyat avtobus ayırır. ID, nominal 60 yer, allowed_route_id və READY/ASSIGNED vəziyyəti saxlanır. Bu bölgü lokal simulyasiya siyasətidir: Open Data-dan rəsmi texniki uyğunluq, daşıyıcı lisenziyası, avtobus modeli və ya buraxılış icazəsi alınmayıb. Gələcəkdə real park və uyğunluq reyestri qoşulmalıdır.

Backend seçimə güvənmir: marşrut/trajectory uyğunluğu, mənbədə bir bütöv LineString, etibarlı koordinatlar, çox böyük koordinat sıçrayışı, avtobusun əvvəlcədən ayrıldığı xətt və READY vəziyyəti yoxlanır. 5km-dən böyük ardıcıl koordinat aralığı konservativ lokal keyfiyyət qaydası ilə yoxlamaya saxlanır; rəsmi normativ deyil. İlkin 1km həddi real kataloqda uzun düz prospektləri də bağladığı üçün 5km seçildi. Bir neçə ayrı path olan xətlər süni şəkildə birləşdirilmir, tam end-to-end trayektoriya təsdiqlənənədək təyinat bağlıdır.

Claim, vehicle yaradılması və audit eyni tranzaksiyadadır. Ümumi lock və şərtli READY→ASSIGNED update iki təyinatın eyni avtobusu götürməsinin qarşısını alır. Eyni request ID eyni avtobusa replay edilir, başqa avtobus/route ilə konflikt qaytarır. Təyin edilən avtobus həndəsənin sıfırıncı progress nöqtəsindən çıxır; artıq xəttin ortasında yaradılmır. 30 saniyə cooldown və 30 avtobus limiti saxlanır. Avtobusu parka geri qaytarma/reassignment əməliyyatı bu mərhələdə əlavə edilməyib.

Əvvəlki EX-* göndəriş tarixçəsi və mövcud avtobuslar saxlanılıb. Yeni göndərişlər seçilmiş RES-* avtobusunu istifadə edir. Fiziki dispatch həyata keçirilmir.

## İstiqamətli dayanacaq keçidləri — 31.10.2026 düzəlişi

Qapalı AYNA həndəsəsi çox vaxt gediş və dönüşü birlikdə saxlayır. Eyni fiziki dayanacaq həndəsənin bir neçə progress nöqtəsinə uyğun gəlir. Əvvəl ən tez çatmanı seçərkən eyni avtobusun əvvəlki, əks istiqamətdəki keçidində minmək də seçilirdi: çatma anı eyni olsa da, sərnişinin terminala gedib geri qayıtması gediş kimi göstərilirdi.

JourneyTiming indi həmin dayanacaq cütü üçün ən qısa istiqamətli həndəsə hissəsini seçir (yaxın proyeksiya fərqləri üçün 100m tolerantlıq). Sonra yalnız uyğun keçidə avtobusun gəlişini hesablayır. Açıq simulyasiya xətlərində sərnişinin gedişi terminalda istiqamət dəyişməsini keçə bilməz; gediş və dönüş fazaları ayrılır. Dönüşün son terminalı cycle koordinatı ilə saxlanılır. Gözləmə və avtobusdakı gediş ayrıca qalır; həndəsə boardProgress → alightProgress aralığını çəkir.

Təyinat namizədləri limit tətbiqindən əvvəl marşrutla əlaqəsi olan dayanacaqlara süzülür. Əvvəl əlaqəsiz yaxın dayanacaqlar uyğun xidmət dayanacaqlarını ilk 8 nəticədən çıxara bilərdi.

Rəsmi istiqamətli dayanacaq ardıcıllığı və cədvəl mənbədə yoxdur: 35m yaxınlıq əlaqəsi, gediş istiqamətinin həndəsədən çıxarılması, sürətə əsaslanan ETA və simulyasiya məhdudiyyətləri qalır. Bu düzəliş real yol/cədvəl dəqiqliyi zəmanəti deyil.

## Simulyasiya intervalı

SIMULATION_HEADWAY_SECONDS=360, SIMULATION_SPEED_KMH=23. Başlanğıcda hər rəsmi trayektoriyada N=max(2,ceil(tam dövrün məsafəsi/(sürət*360s))) baza avtobusu yerləşdirilir. Eyni sürət və bərabər fazalar intervalın zamanla pozulmasının qarşısını alır. Açıq trayektoriyaların tam dövrünə dönüş də daxildir. Başlanğıcda baza simulyasiya avtobusları yenidən paylanır; real GPS və operatorun RES/EX avtobusları dəyişdirilmir. ID-lər sabitdir, restart yeni dublikat yaratmır. Parametr azaldılarsa əvvəl yaradılmış əlavə avtobuslar silinmir.

Bu rəsmi cədvəl deyil: təxminən 6 dəqiqədən çox olmayan baza intervalıdır, faktiki gözləmə 0–6 dəqiqə arasında dəyişə bilər. Piyada/aktarma vaxtı əlavədir. Operator limitinə baza parkından əlavə ən az 10 yer ayrılır.
