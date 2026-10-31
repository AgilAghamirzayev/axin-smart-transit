# AI istifadəsi haqqında bəyannamə

Layihə: Axın — Smart Transit & Crowdsourcing Engine.
Tarix: 31 oktyabr 2026.

## İstifadə edilmiş alət

OpenAI Codex (ChatGPT desktop daxilində işləyən AI proqramlaşdırma agenti) arxitektura, Java/Spring Boot backend, Next.js/TypeScript frontend, testlər, sənədləşmə və xəta düzəlişləri üçün istifadə edilib. Ayrıca Cursor, Copilot və ya başqa modelin istifadə edildiyi iddia edilmir.

Agent terminaldan Maven/npm/CLI əmrlərini işlətdi; rəsmi shadcn CLI komponentləri yaratdı; browser və avtomatlaşdırılmış testlərlə axınları yoxladı. Web axtarışından rəsmi texnologiya sənədləri və Azərbaycan məlumat mənbələrini araşdırmaq üçün istifadə olundu. Mənbələr DATA_SOURCES.md-dədir.

## İstifadəçinin əsas promptları

Əsas promptun tələbləri: Spring Boot/Java backend, Next.js/TypeScript frontend, hər ikisində feature-based package strukturu, Clean Code/SOLID, real işləyən FR-01–FR-10, unit/integration testlər, README, AI Declaration və Technical Explanation. İki rəsmi tapşırıq şəklinə baxmaq və frontend üçün https://ui.shadcn.com/ istifadə etmək istənib.

Implementasiya göstərişi (istifadəçinin mətnindən):
> “bunu hem backend hem frontend olaraq full implementasiya et backend clean code prinsiplerine uygun olsun ve feature based package strukturunu istifade et hem back hem de fronmtend ucun. sekillere de bax en uygun formada yaz.”

Dəqiqləşdirmə:
> “real gps de yoxdur onun ucun azerbaycan ucun open data varsa ozun tap yoxdursa da ozun generasiya et”

Sonrakı inteqrasiya promptları:
> “burdan marsurutlarin roteleri ve nomreleri varsa tapa bilersen?” — opendata.az transport axtarışı ilə.

> “ela ikisini de bizim sayta integrasiya et professional sekilde”

Bunlar həmin çatda verilən promptlardır. Ayrı-ayrı insan tərəfindən yazılmamış promptları gerçək prompt kimi təqdim etmirik.

## AI-nin qərar verdiyi hissələr

- Modul sərhədləri, DTO-lar, JDBC persistence, Flyway schema və Clock əsaslı test arxitekturası.
- Minimum 3 səs, 60% HIGH, 2 dəqiqə report TTL, 60 saniyə GPS TTL və davamlı 10 dəqiqə semantikası.
- Axın adı, Azərbaycan dilində responsive UI, rənglər və layout.
- İlkin D1–D3 test şəbəkəsi; sonradan AYNA/BakuBus rəsmi data idxalı, 35m yaxınlıq namizədləri, 5m həndəsə sadələşdirilməsi və rəsmi həndəsədə backend GPS simulyasiyası.
- Auth/cooldown/idempotency, API proxy, deployment və test skriptləri.

## Yoxlama və məsuliyyət

AI tərəfindən yaradılmış kod avtomatlaşdırılmış test və build ilə yoxlanıb; dəqiq nəticələr VERIFICATION.md-dədir. Bu, müstəqil insan code review-si və ya production təhlükəsizlik auditi demək deyil. Komanda təqdimatdan əvvəl arxitekturanı, qaydanın seçilmiş şərhini, lisenziyaları və GPS/ETA məhdudiyyətlərini nəzərdən keçirməli və öz sözləri ilə izah edə bilməlidir.

Canlı rəsmi GPS istifadə edilməyib. AI/simulyasiya məlumatları rəsmi data kimi təqdim edilmir. Sənəddə adı çəkilən e-poçt ünvanlarına bu agent tərəfindən göndəriş edilməyib.

## Son genişləndirmə — 31 oktyabr 2026

İstifadəçi zoom qorunmasını, başlanğıcdan təyinata sıxlığa həssas səfər seçimini, dayanacaq/təyinat ETA-sını, GPS əsasında sərnişin iştirakını və operatorun əlavə avtobus göndərməsini istədi. Codex bu tələblərdən journey, presence və dispatch feature-lərini, V5 miqrasiyasını, UI axınlarını və testləri yaratdı. GTFS-in rəsmi Schedule/Realtime spesifikasiyaları araşdırıldı. UI/UX Pro Max qaydaları formaların feedback və razılıq axınının yoxlanmasında istifadə edildi. Konkret algoritm sərhədləri və tutum/ETA fərziyyələri JOURNEY_ETA_AND_OPERATIONS.md-də açıqlanır.

### Kompakt sərnişin axını — 31.10.2026

Son istifadəçi tələbləri: marşrut seçimini searchable etmək; mövqedə aydın zoom; təyinatdan sonra yaxın başlanğıc dayanacağının avtomatik seçilməsi; sürət/sıxlıq/qənaət meyarları; az scroll və yalnız səfər trayektoriyasının xəritədə çəkilməsi. Codex bu axını, istiqamətli həndəsə kəsilməsini, yaxın dayanacaqlar arasında aktarmanı və E2E ssenarilərini implementasiya etdi. Qənaət üçün təsdiqsiz tarif yaradılmadı: az minik sayına əsaslanan meyar açıq qeyd edildi. AYNA-nın rəsmi tarif məlumatı barədə açıqlaması araşdırıldı. Development reload dövrü görüldüyü üçün lokal nümayiş production standalone build üzərində başladıldı.

Operator təyinatı yenilənməsi: istifadəçinin “hissə deyil, end-to-end trayektoriyaya konkret avtobus assign etmək” tələbi üzrə Codex V6 reserve parkı, source geometry policy, uyğunluq API-si, transactional claim, başlanğıcdan çıxış, searchable seçim və xəritəli panel implementasiya etdi. Rəsmi məlumatda avtobus icazə reyestri olmadığından lokal bölgü ayrıca işarələndi. Aralı həndəsələrin birləşdirilməməsi və koordinat keyfiyyət həddi AI tərəfindən seçilmiş, sənədləşdirilmiş tətbiq qaydalarıdır.

## Yekun iterasiyalar və prompt qeydləri

Aşağıdakı sitatlar istifadəçinin həmin söhbətdə verdiyi göstərişlərdir; orfoqrafiya saxlanılıb:

> “tovsiyeler indi cox uzandi evvel sadece bir aktarmali tovsiyeler verirdi indi bize en yaxin dayanacagi secir sadece hemcinin basqa dayanacaqlarada baxsin ve eger aktarmasiz varsa onl;ari tovsiyye etsin meqsed en az aktarma olmalidir”

Nəticə: başlanğıc ətrafında alternativ dayanacaqların axtarışı, minimum minik prioriteti və maksimum 3 tövsiyə kartı.

> “simul;asiyada avtobuslarin sayini ele artirki gzoeleme vaxti realistik olsun 5 deq 7 deq  o vaxti cox artitir”

Nəticə: park ölçüsü trayektoriya uzunluğu və konfiqurasiya olunan 6 dəqiqə hədəf intervaldan hesablandı. Bu, real avtobus sayı kimi təqdim edilmir.

> “ela hamsi hazirdir indi ui uzerinde isleyek bunun cun referans olaraq google mapi gotur ordaki componentleri istifade et ve professional sekilde redesign et amma butun funksyonalliqlar oldugu kimi qalsin”

Nəticə: Google Maps vizual yanaşmasından ilhamlanan panel/xəritə quruluşu yaradıldı; Google-un daxili komponent kodu köçürülmədi. shadcn/ui, Lucide və Leaflet istifadə edildi.

> “componentlerde bezi sehvler var senior frontend developer kimi analiz et ve dogru formada yaz”

Nəticə: combobox fokus sərhədi, popup ankrajı, mobil eni və klaviatura davranışı düzəldildi.

> “indi bunlari professional seklide hazirla ve sonda githuba push et github chromede aciqdir”

Nəticə: README, bu bəyannamə və Notepad formatlı texniki izah yekun implementasiyaya uyğunlaşdırıldı; GitHub təhvili hazırlandı.

Söhbətdə əlavə olaraq avtomatik başlanğıc mövqeyi, 1 km-dən qısa səfərdə piyada variantı, istiqamət səhvləri və ETA cəmi üzrə düzəlişlər istənib. Bu cümlə promptların məzmun xülasəsidir, birbaşa sitat deyil.

## Yekun yoxlama statusu

Əvvəlki mərhələdə 46 backend, 16 frontend və 3 operator E2E testi keçib. Son dəyişikliklərdən sonra istifadəçinin testləri sürət üçün keçmək göstərişi əsasında tam suite təkrar işlədilməyib. Compile/build və seçilmiş lokal API/brauzer yoxlamaları aparılıb. Tarixi uğurlu nəticələr hazırkı commit üçün tam test zəmanəti deyil. Sınaq tarixçəsi [VERIFICATION.md](VERIFICATION.md)-dədir.

AI kod, test və sənədlərin hazırlanmasına geniş töhfə verib; müstəqil insan code review-si aparıldığı iddia edilmir. Komanda təqdim olunan həllin məhdudiyyətlərini və əsas qərarlarını özü müdafiə etməlidir. Cursor/Copilot və ya istifadə olunması təsdiqlənməmiş başqa alətlərin adı istifadə edilmiş kimi göstərilmir.
