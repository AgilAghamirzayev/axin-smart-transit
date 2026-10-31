# Qəbul meyarları və izlənəbilərlik

| ID | İmplementasiya | Yoxlama |
|---|---|---|
| FR-01 | Marşrut select/card, routeId filter | E2E passenger + MockMvc filtering |
| FR-02 | Unikal dayanacaq select/map click, stopId filter; digər xətlərin avtobusları yalnız həmin stop-da varsa görünür | Rəsmi kataloq integration: 3600 stop, 49 unmatched; path-specific ETA və filtering |
| FR-03 | Backend GPS simulator, 3 saniyə polling, moving Leaflet markers; real GPS PUT API | E2E koordinat dəyişikliyi; GPS auth/order/validation |
| FR-04 | İstiqamətli polyline ETA, dəqiqə, stale null | Geometry unit + snapshot integration + E2E |
| FR-05 | Aşağı / Orta / Yüksək dialog | UI unit + E2E |
| FR-06 | DB crowd_report, idempotency/cooldown, transaction | Integration DB count + E2E refresh |
| FR-07 | Qorunan operator səhifəsi, bütün xətt cədvəli/xəritə | Rol testləri + E2E login |
| FR-08 | GPS freshness + report freshness + latest unique vote aggregation | TTL/duplicate/ratio unit və integration |
| FR-09 | Persisted high_since, default 600s; unknown/gap reset | 599/600 unit; 10 virtual dəqiqə integration |
| FR-10 | Epizod üçün bir alert; əlavə avtobus tövsiyəsi; ack/resolve/recur | Integration tam həyat dövrü |
| DOC-01 | README, Docker/local, arxitektura | Repozitoriyada |
| DOC-02 | AI_DECLARATION.md, gerçək promptlar və rol | Repozitoriyada |
| DOC-03 | TECHNICAL_EXPLANATION.txt (Notepad) | Repozitoriyada |
| QA-01 | JUnit/MockMvc, Vitest, Playwright, CI | VERIFICATION.md |

## Əl ilə təqdimat ssenarisi

1. Tətbiqi açın: AYNA/BakuBus mənbə etiketi və simulyasiya izahı görünür. Mənbələr dialoqundan tarix/lisenziya/35m məhdudiyyətinə baxın.
2. 5 nömrəli marşrutu, sonra yaxın dayanacaq namizədini seçin: intervala əsasən yaradılmış simulyasiya parkı və təxmini ETA. Nömrə/dayanacaq axtarışını yoxlayın.
3. Avtobus markerini/kartını seçin; sıxlıq dialoqundan bir səviyyə göndərin.
4. Operator girişi; 5 nömrəli xəttin bildiriş sayının dəyişməsinə baxın.
5. demo-high-load skriptini başladın; 3 ayrı sintetik sərnişin səsi HIGH vəziyyətini saxlayır.
6. Default 10 dəqiqə həddindən sonra tövsiyə; baxıldı; script dayandıqdan sonra TTL ilə resolve.
7. Köhnə GPS/internet yoxdursa məlumatın açıq şəkildə köhnə/əlçatmaz göstərilməsini nümayiş etdirin.

Əlavə profil ilə qısaldılmış demo aparılsa, dəyişən müddət paneldə göstərilir və münsifə açıq deyilməlidir. Default qayda 10 dəqiqə olaraq qalır.

Yoxlama sütunu mövcud test əhatəsini göstərir; son commit-də hamısının yenidən keçdiyi iddia edilmir. Faktiki icra tarixçəsi VERIFICATION.md-dədir.
