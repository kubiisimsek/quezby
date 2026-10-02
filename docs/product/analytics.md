# Quezby — analitik ve cihaz kaydı

Oyuncuların oyunu nasıl kullandığını görmek için kendi API'mizde çalışan küçük
bir analitik. Kim geliyor, ne kadar kalıyor, nereye bakıyor, ertesi gün dönüyor
mu? Panelde iki yerde görünür: **Genel → Analitik** ve oyuncu sayfasının
**Etkinlik** sekmesi.

İki kuralı var:

- İzin olmadan davranış verisi toplanmaz.
- Veri, oyuncu ve trafik arttıkça şişmez.

Kod:

- `packages/config/src/analytics.ts` (katalog);
- `apps/api/app/Services/Analytics`;
- `apps/mobile/src/analytics` ve `src/hooks/useAnalytics.ts`;
- `apps/admin/src/pages/AnalyticsPage.tsx`.

Sözleşme: [api-contract.md](../backend/api-contract.md) (`POST /analytics/visits`,
`X-Device`, `settings.analytics`) ve [admin-api.md](../backend/admin-api.md)
(Analitik).

## İki tür veri

| | Kullanım verisi (analitik) | Cihaz kaydı |
| --- | --- | --- |
| Ne | Ziyaretler (uygulamanın ön planda kaldığı her süre), gezilen ekranlar sırasıyla, birkaç an (paylaşım, "Geç onu", deneme turunun bitişi…), oyuncunun aktif günleri, ilk kezleri | Telefon başına tek satır: kurulum kimliği, platform, sistem sürümü, marka (üretici), model, uygulama sürümü ve derlemesi, ilk ve son görüldüğü gün |
| Ne zaman | Yalnızca oyuncu **"İzin ver"** dedikten sonra | Herkes için; izne bakılmaz |
| Neden | Oyunu iyileştirmek: geri dönüş, ilk adımlar, ekranlar | Oyunun çalışması ve güvenliği: destek, uyumluluk, aynı telefondaki hesaplar |
| Nerede | `analytics_visits`, `analytics_player_days`, `analytics_totals`, `analytics_milestones` | `player_devices` |
| Silinme | Oyuncu izni geri alınca da, hesabı silinince de. Anonim günlük toplamlar kalır | Hesapla birlikte; 180 gün görülmeyen telefon ve oyuncu başına 10'u aşan en eski telefon silinir |

**Hiç toplanmayanlar:**

- ad, e-posta, IP adresi, konum, rehber;
- serbest metin;
- post başına ya da dokunuş başına olay.

Oyunun kendisi (turlar, skorlar, her post ve hareket) zaten `runs` ve
`content_stats`'ta; analitik onları bir daha toplamaz.

**Hata kayıtları (panelin Loglar sayfası) analitik değildir.** API'nin
hataları, Firebase/Google/Apple'a giden başarısız istekler, her push'un ne
olduğu ve telefonun yuttuğu hatalar (push token alınamadı, API'ye
ulaşılamadı, çökme — `POST /me/logs`) oyunun çalışması için tutulur; izne
bakılmaz. Oyuncu kimliği, platform ve uygulama sürümüyle `system_logs`'ta
seviyesine göre durur (hata 90, uyarı 14, bilgi 3 gün), hesapla birlikte
silinir; günlük sayıları (`system_log_days`) kimseyi adlandırmaz ve hiç
silinmez; token, şifre ve anahtar hiç yazılmaz,
oyuncunun yazdığı hiçbir şey gitmez. Mağaza beyanında bu **Tanılama → Çökme
verisi / Diğer tanılama verileri** (kullanıcıya bağlı, uygulama işlevi
için) demektir — `docs/backend/api-contract.md` → *Logs*.

## İzin

- **Nerede sorulur:**
  - İlk açılışta, hesap açıldıktan ya da girildikten sonra (ve giriş yapanın adından sonra), bildirim sorusundan önce tek bir soru sorulur: **"Oyunu birlikte geliştirelim mi?"** Karşılama, deneme turu ve giriş ekranı bu sorudan önce gelir; onlar hiç sayılmaz (`tutorial_done` yeni oyuncuda kaydedilmez). Hesap başka bir telefonda evet dediyse sorulmaz.
  - Bu sorudan önce kurulmuş bir telefonda, lobinin en üstünde bir kez sorulur.
  - Lig hatırlatması ("Hesabını koru") bu cevaptan sonraya kalır.
- **Butonlar:** **İzin ver** ve **İzin verme** aynı boyuttadır; hayır demek evet demek kadar kolaydır. İkisi de altın değildir: altın yalnızca oyunu başlatır.
- **Cevaptan önce ve sonra:**
  - Cevaptan önce hiçbir şey sayılmaz.
  - Cevap önce telefonda durur (`consent: pending`), hemen ardından API'ye gider (`useConsentSync`; ağ yoksa bir sonraki dönüşte). API onu kabul edene kadar hiçbir ziyaret gönderilmez.
  - Hesapta cevap bir **zaman damgası** olarak tutulur: `users.analytics_at`, izin kanıtı.
- **Değiştirmek:** Karar **Profil → Ayarlar → Kullanım verisi** ile değişir.
  - Kapatılınca telefon bekleyen ziyaretleri siler.
  - API de oyuncunun ziyaretlerini, günlerini ve ilklerini siler (`Consent::revoke`).
- **Çıkış:** Hesaptan çıkan oyuncunun telefonundaki cevap unutulur. Aynı telefona giren bir sonraki kişiye yeniden sorulur.

## Veri şişmesine ve yoğun akışa karşı

| # | Çözüm | Nasıl |
| --- | --- | --- |
| 1 | Zaten bilineni toplama | Tur, skor, post, arkadaşlık, mesaj, VS, lig analitik olayı değildir; oyunla ilgili sayılar mevcut tablolardan gelir. En büyük olası akış (post başına olay) baştan yoktur. |
| 2 | Olay değil, ziyaret özeti | Telefon bir ziyareti kendi içinde toplar. Uygulama arka plana geçince **tek istek** gider: süre, ekran yolculuğu (en çok 40 adım), olay sayıları. Olay başına bir istek yerine ziyaret başına bir istek olur. |
| 3 | Kapalı katalog | 21 ekran ve 13 an `@quezby/config`'te durur, API ile `fixtures/analytics.json` üzerinden eşlenir. Serbest metin ya da özellik yoktur. API bilmediği bir kodu atar ve `dropped` olarak sayar. |
| 4 | Sert sınırlar | İstekte ≤ 10 ziyaret, yolculukta ≤ 40 adım, kod başına ≤ 999, telefonda bekleyen ≤ 20 ziyaret, ≤ 7 günlük ziyaret, ziyaret başına ≤ 4 saat, oyuncu başına günde ≤ 50 ziyaret. İstek sınırı dakikada 12'dir. |
| 5 | İki kez sayma yok | Ziyaret kimliğini telefon üretir. `unique(user_id, client_id)` ve `insertOrIgnore` vardır. Önce ziyaret satırı yazılır, sonra sayaçlar: bir hata sayı kaybettirir ama asla çift saydırmaz. |
| 6 | Katmanlı saklama, anında özet | Sayaçlar yazılırken artar, sonradan toplu işe gerek kalmaz. Ziyaretler 30 gün (en az 8), oyuncu-günleri 90 gün kalır. Anonim günlük toplamlar süresizdir, günde birkaç düzine satır. |
| 7 | Günde bir yazma, sıfır ek G/Ç | "Bugün geldi" ve cihaz kaydı, bir token'ın **günün ilk isteğinde** bir kez yazılır. Kapı Sanctum'un zaten tuttuğu `last_used_at`'in bir önceki değeridir (`TokenAuthenticated` olayı güncellemeden önce gelir). Önbellek dosyası kullanılmaz: dosya önbelleği süresi dolanı silmez, oyuncu-gün başına bir dosya hostingin inode sınırını doldururdu. |
| 8 | Cron'suz bakım | Budama API'de, bir alım isteğinden sonra (`defer`) saatte en çok bir kez, 500 satırlık parçalarla yapılır. Tek bir önbellek anahtarı kullanır. Ayrıca `php artisan quezby:analytics:prune` (cron varsa günlük) ve panelde **Sistem → Analitiği temizle** var. |
| 9 | Vanalar ve geri çekilme | `QUEZBY_ANALYTICS_ENABLED=false` her şeyi durdurur. `QUEZBY_ANALYTICS_SAMPLE` izin verenlerin binde kaçının tutulacağını belirler; aynı oyuncular hep içeride kalır, `crc32(id)`. API `record: false` derse telefon 24 saat kaydetmez. Başarısız gönderimden sonra 60 sn beklenir. |
| 10 | Saat düzeltme | Toplu istek gönderildiği anın `sentAt` damgasını taşır. API, telefon saatinin kaymasını her ziyaretin başlangıcından düşer. |
| 11 | Transaction yok | MySQL'de `INSERT IGNORE` kilidini commit'e kadar tutar. Aynı sıcak toplamı artıran iki toplu istek kilitlenirdi. Her ifade tek başına çalışır, kovalar hep aynı sırayla yazılır. |

**Hacim (ölçüldü, 2026-10-02).** Gerçek migration'larla kurulan bir MySQL 9
veritabanına gerçeğe benzer satırlar yazıldı, boyutları `information_schema`'dan
okundu (veri + indeks). Satır başına:

- ziyaret 631 B (yolculuk ortalama 12 adım);
- oyuncu-günü 228 B;
- günlük toplam 97 B;
- ilk kez 131 B;
- cihaz 421 B;
- tur 6,2 KB (karşılaştırma için).

Varsayımlar:

- Herkes izin veriyor (üst sınır).
- Oyuncu başına günde 3 ziyaret.
- Günlük aktiflerin %10'u yeni, her biri yaklaşık 4 ilk kez.
- Son 180 günde görülen farklı telefon, günlük aktifin 10 katı.
- Günde yaklaşık 45 toplam satırı, oyuncu sayısından bağımsız.

| Günlük aktif oyuncu | Günde eklenen | 90 günde (tavan) | 1 yılda | Sonra her yıl |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 6 KB | 0,5 MB | 1,6 MB | +1,5 MB |
| 100 | 0,2 MB | 8,6 MB | 11 MB | +3 MB |
| 1.000 | 2,1 MB | 83 MB | 98 MB | +20 MB |
| 10.000 | 21 MB | 823 MB | 0,94 GB | +0,18 GB |

- **Tavan:** Ziyaretler 30, oyuncu-günleri 90 günde silinir; analitik 90. günde büyümeyi bırakır.
- **10.000 oyuncuda dağılım:** ziyaretler 542 MB, oyuncu-günleri 196 MB, cihaz kaydı 40 MB.
- **Büyümeye devam edenler:** İlk kezler (yılda 0,18 GB, hesapla birlikte silinir) ve toplamlar (yılda 1,5 MB).
- **İstek:** oyuncu başına günde yaklaşık 3 alım isteği (10.000 oyuncuda 30 bin). "Bugün geldi" için ek istek yok.
- **İzin oranı:** İzin verenlerin oranı neyse cihaz kaydı dışındaki her şey o kadar küçülür.

**Ölçek büyüyünce kullanılacak kollar:**

- `QUEZBY_ANALYTICS_VISIT_DAYS=14` ziyaret katmanını yarıya indirir.
- `QUEZBY_ANALYTICS_SAMPLE=250` her şeyi dörtte birine indirir.

**Asıl büyük tablo başka yerde.** Her biten tur, tüm hamle kaydını `runs.actions`'ta tutuyor ve hiç silinmiyor. Yereldeki gerçek turlarla ölçüldü (2026-10-02, MySQL 9):

- Hamle kaydı ortalama 3,1 KB metin (yaklaşık 310 hamle).
- Tur satırı 9,1 KB tutuyor; bunun %85'i hamle kaydı.
- Kaydı silinmiş bir tur 1,4 KB.
- Kayıt zlib ile sıkıştırılırsa (0,8 KB) tur 2,5 KB.

Bugünkü hali, oyuncu başına günde 10 turla:

| Günlük aktif oyuncu | Günde | 30 günde | 1 yılda |
| ---: | ---: | ---: | ---: |
| 1 | 89 KB | 2,6 MB | 32 MB |
| 100 | 8,7 MB | 260 MB | 3,1 GB |
| 1.000 | 87 MB | 2,5 GB | 31 GB |
| 10.000 | 868 MB | 25 GB | 309 GB |

10.000 oyuncuda turlar, analitiğin bir yılda tuttuğunu bir günde tutar. Seçenekler (10.000 oyuncu):

| Seçenek | 1. yıl | Sonra her yıl |
| --- | ---: | ---: |
| Bugünkü hali | 309 GB | +309 GB |
| Kayıt 90 gün sonra silinir | 112 GB | +47 GB |
| Kayıt 30 gün sonra silinir | 68 GB | +47 GB |
| Kayıt sıkıştırılır, hiç silinmez | 84 GB | +84 GB |
| Sıkıştırılır, 90 gün sonra silinir | 56 GB | +47 GB |

- **Kaydı silinen turlar da büyür:** 10.000 oyuncuda yılda 47 GB. Bunu durdurmak, eski turların kendisi için ayrı bir karar ister.
- **Boşalan yer:** Silinen kaydın yeri yeni turlarca kendiliğinden kullanılır. Dosya küçülmez; hostinge geri vermek için bir kez `OPTIMIZE TABLE runs` gerekir.
- **Kaydı kim okuyor:**
  - incelemede bekleyen bir turun onayı (oyuncunun istatistiğine eklenir);
  - sıralamadaki turların kanıtı;
  - panelin tur sayfasındaki post post zaman çizelgesi.
  Oyuncunun geçmiş oyunları kaydı değil, kayıtlı özeti (`stats`) okur.
- Saklama kuralı henüz yok; bu belge onu kapsamıyor.

## Telefonda

`useAnalytics` (`RootNavigator`'da bir kez bağlanır) bir ziyareti şöyle yönetir:

- `active` açar ya da sürdürür.
- `inactive` duraklatır ve kaydeder (arama, uygulama değiştirici).
- `background` kapatır, bekleyenlere ekler ve gönderir.

Diğer ayrıntılar:

- **Uygulama öldürülürse:** Açık ziyaret AsyncStorage'dadır (`quezby.visits.v1`). Bir sonraki açılışta son dokunulan anda kapatılır. Dakikada bir "hâlâ buradayım" notu yalnızca telefonda tutulur.
- **Olay kaydı:** `track(event)` ve `trackScreen(route)` yalnızca telefondaki ziyareti değiştirir, ağa asla dokunmaz. İzin yoksa hiçbir şey yapmaz.
- **Hesaba bağlama:** Her ziyaret, kaydedildiği andaki token'ın özetiyle etiketlenir (`sha256(token)`, ilk 16 hane). Yalnızca o hesabın ve girişten önceki ziyaretler gönderilir; başka hesabınkiler atılır.
- **Android:** Paylaşım sayfası uygulamayı arka plana atar, bu yüzden ziyaret ikiye bölünür. Bu bilerek kabul edildi.
- **Cihaz başlığı:** Her istek `X-Device` başlığını taşır:

  ```
  install=…; platform=ios; os=18.2; brand=Apple; model=iPhone%2015; build=42
  ```

  Kurulum kimliği, token'la birlikte açılışta okunur; böylece ilk istek bile telefonu tanıtır. Marka sistemin üreticisidir (`getManufacturer`): Redmi ve POCO, Xiaomi'dir.

## Panelde okumak

- **Bant:**
  - Şu an bağlı: son 5 dakikada API'ye dokunan herkes, izin aranmaz.
  - Bugün aktif, 7 günde ve 30 günde aktif (kayan pencereler).
  - Yapışkanlık: bugün aktif ÷ 30 günde aktif.
- **Aktif oyuncular:** Dönenler mor, ilk gününde olanlar yeşil.
- **Geri dönüş:** Katıldığı gün (izin vererek) oyunu açan yeni oyuncular haftalık kohortlara ayrılır. Her kohort için 1., 3., 7., 14. ve 30. günde kaçının döndüğü gösterilir.
  - Henüz bitmemiş bir gün "—" görünür.
  - İzni sonradan veren eski oyuncular kohortlara girmez.
- **İlk adımlar:**
  - Katıldı → deneme turu → ad → hesap koruma → ilk sayılan tur → lig → ertesi gün dönüş.
  - Oranlar katılanlara göredir.
  - "Ertesi gün döndü" yalnızca dünden önce katılanlar arasında hesaplanır.
- **Ekranlar, anlar, cihazlar:** Cihazlar kayıttan gelir; izin aranmaz.
  - Ekran kodları uygulamanın rotalarıdır (`src/analytics/screens.ts`; yeni bir rota burada adlandırılmadan derlenmez).
  - Arkadaşlarla gelenler: `friends` Mesajlar sekmesi, yani mesaj kutusu (2026-09-29'a kadar adı Arkadaşlar'dı ve istekler de oradaydı), `friend_list` bir arkadaş listesi (oyuncunun kendi listesi bekleyen istekleriyle ya da bir arkadaşının listesi), `search` **Arkadaş bul**, `thread` bir arkadaşla sohbet, `alerts` lobideki zilin açtığı **Bildirimler** listesi (istekler, VS'ler ve sonuçları). Yeni oyuncunun bildirim izni adımı `notifications`'tır, bu değil.
  - Profille ve ilk adımlarla gelenler: `history` geçmiş oyunlar, `avatar` profil fotoğrafını çerçeveleme, `notifications` yeni oyuncunun bildirim adımı, `account` Ayarlar → **Hesap bilgileri** (ad, giriş yolları, hesabı silme).
- **Cihazlar (sayfanın altında):** Son 7 günde görülen telefonlar, tablo tablo:
  - her sistem için bir tablo (iOS, Android), satırlar ana sürüm;
  - en çok telefonu olan üç marka için birer tablo (Apple'ınki **iPhone**), satırlar model;
  - kalan markalar **Diğer markalar**'da, marka başına bir satır;
  - her satırın altında o telefonlardaki uygulama sürümleri: en çok kullanılan üçü ve "diğer";
  - tablo en büyük 10 satırı listeler, kalan telefonları altında sayar;
  - marka 2026-10-02'den sonraki uygulama sürümüyle gelir. Daha eski sürümdeki Android telefonlar **Markası bilinmeyen** tablosunda durur ve yeni sürümle açıldıkları gün yerlerine geçer. iPhone her zaman Apple'dır.
- **Veri hacmi:** Her katmanın satır sayısı, en eski kaydı ve saklama süresi, bir de son 7 günde geri çevrilenler. Şişme gözle görülür.
- **Oyuncunun Etkinlik sekmesi:**
  - 30 günlük şerit (gelmediği gün gri, kaldıkça yeşil);
  - son 20 ziyaret ve yolculukları;
  - ilk kezler: hesabın açılışı, deneme turu, ad ya da korumayı geçmek, koruma, ilk sayılan tur, lig.
- **Oyuncunun Cihazlar sekmesi:** Cihaz kaydı ve aynı telefonu kullanan diğer hesaplar.

Bütün oranlar API'den binde olarak gelir; panel hiçbir şey hesaplamaz.

## Ortam değişkenleri

| Değişken | Varsayılan | Ne |
| --- | --- | --- |
| `QUEZBY_ANALYTICS_ENABLED` | `true` | Kapatma anahtarı |
| `QUEZBY_ANALYTICS_SAMPLE` | `1000` | İzin verenlerin binde kaçı tutulur |
| `QUEZBY_ANALYTICS_VISIT_DAYS` | `30` (en az 8) | Ziyaretler ve yolculukları |
| `QUEZBY_ANALYTICS_DAY_DAYS` | `90` (en az 62) | Oyuncu-günleri |
| `QUEZBY_DEVICE_DAYS` | `180` | Görülmeyen telefon ne kadar kalır |

## Sahibin yapacakları (repo dışında)

Hukuki danışmanlık değildir; yayından önce bir hukukçuya göster.

- **KVKK aydınlatma metni ve gizlilik politikası:**
  - İki veri türünü ve amaçlarını yaz: kullanım verisi (açık rıza) ve cihaz kaydı (hizmetin sunulması ve güvenlik).
  - Saklama sürelerini ve izni geri almanın yolunu yaz: **Ayarlar → Kullanım verisi**.
- **App Store gizlilik etiketi:**
  - *Kullanım Verileri → Ürün Etkileşimi*: analitik, kullanıcıya bağlı, izleme yok.
  - *Tanımlayıcılar → Cihaz Kimliği* ve *Tanılama*: uygulama işlevi.
  - `ios/Quezby/PrivacyInfo.xcprivacy` bunları beyan ediyor.
  - Önceden beyan edilmesi gereken e-posta ve kullanıcı kimliği de listede olmalı.
- **Google Play Veri güvenliği:**
  - *Uygulama etkinliği → Uygulama etkileşimleri* (isteğe bağlı, analitik);
  - *Cihaz veya diğer kimlikler* (uygulama işlevi, güvenlik).
- **App Tracking Transparency gerekmez:** Veri başka şirketlerle birleştirilmiyor, reklam için kullanılmıyor.
