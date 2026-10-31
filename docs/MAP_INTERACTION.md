# Xəritə və məkan yenilənməsi

Standart tab **Azərbaycan · Open Data**: ETSN-in rayon/yaşayış məntəqəsi GeoJSON qatı + OSM küçə fonu. Alternativ **Küçə · OpenStreetMap**: həmin küçə fonu, coğrafi qat olmadan. Tab dəyişməsi MapContainer-i yenidən yaratmır: zoom, pan, seçilmiş marşrut/dayanacaq və geolocation watcher saxlanır.

Dayanacaq seçimi shadcn/Base UI Combobox-dur. Eyni input yazılan adı/ID-ni axtarır və nəticədən seçim edir. Bütün kataloq üzərində axtarışdan sonra maksimum 80 nəticə render edilir. Azərbaycan hərfləri və sadə Latin yazılışı uyğunlaşdırılır. Eyni adlı dayanacaqlar ID və koordinatla ayrılır. Arrow/Enter/Escape, boş nəticə və təmizləmə dəstəklənir. Marşrut dəyişəndə seçim/axtarış təmizlənir; xəritədən seçim input-a əks olunur.

Məkan izlənməsi yalnız istifadəçi düyməni basdıqda başlayır. `enableHighAccuracy=true`, `maximumAge=0`, `timeout=20000`. Dəqiqlik cihaz/brauzerin imkanından asılıdır; proqram GPS avadanlığının dəqiqliyini artıra bilməz.

- 15 saniyədən köhnə, ardıcıllığı pozulan, etibarsız koordinat/accuracy və 5 saniyədən artıq gələcək timestamp qəbul olunmur.
- Son 10 saniyədə daha dəqiq ölçmə varsa 2 dəfədən çox pisləşən və 50m-dən böyük qeyri-dəqiqliklə gələn fix əvəzinə əvvəlki saxlanır. Bundan sonra hərəkət edən istifadəçini dondurmamaq üçün aktual coarse ölçmə qəbul edilir, həqiqi uncertainty göstərilir.
- 100m-dən geniş dəqiqlik “təxmini” kimi göstərilir. 30 saniyə yeni ölçmə yoxdursa marker boz və “son mövqe köhnəlib” olur.
- Permission denied izləməni dayandırır. Timeout/temporarily unavailable zamanı watcher davam edir; əvvəlki mövqe canlı kimi təqdim edilmir, yaşı yoxlanır.
- Yeni sorğu və dayandırma əvvəlki watcher-i ləğv edir, gecikmiş callback-ləri session nömrəsi ilə rədd edir. İlk qəbul edilmiş fix accuracy radiusuna uyğun mərkəzlənir; sonrakılar istifadəçinin pan/zoom seçimini dəyişmir.

Koordinat və accuracy süni şəkildə “düzəldilmir”, marşruta snap edilmir, backend-ə yazılmır. Dəqiq yer göstərilməsi üçün telefonda GPS və brauzer məkan icazəsi lazımdır; masaüstündə Wi-Fi/network nəticəsi geniş radiuslu ola bilər.
