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
| Ne | Ziyaretler (uygulamanın ön planda kaldığı her süre), gezilen ekranlar sırasıyla, birkaç an (paylaşım, "Geç onu", deneme turunun bitişi…), oyuncunun aktif günleri, ilk kezleri | Telefon başına tek satır: kurulum kimliği, platform, sistem sürümü, model, uygulama sürümü ve derlemesi, ilk ve son görüldüğü gün |
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

## İzin

- **Nerede sorulur:**
  - İlk açılışta, karşılama ekranında, oyuna girmeden tek bir soru sorulur: **"Oyunu birlikte geliştirelim mi?"**
  - Bu sorudan önce kurulmuş bir telefonda, lobinin en üstünde bir kez sorulur.
  - Lig hatırlatması ("Hesabını koru") bu cevaptan sonraya kalır.
- **Butonlar:** **İzin ver** ve **İzin verme** aynı boyuttadır; hayır demek evet demek kadar kolaydır. İkisi de altın değildir: altın yalnızca oyunu başlatır.
- **Cevaptan önce ve sonra:**
  - Cevaptan önce hiçbir şey sayılmaz.
  - Cevap önce telefonda durur (`consent: pending`). Hesap açılınca ya da girilince API'ye gider (`useConsentSync`). API onu kabul edene kadar hiçbir ziyaret gönderilmez.
  - Hesapta cevap bir **zaman damgası** olarak tutulur: `users.analytics_at`, izin kanıtı.
- **Değiştirmek:** Karar **Profil → Ayarlar → Kullanım verisi** ile değişir.
  - Kapatılınca telefon bekleyen ziyaretleri siler.
  - API de oyuncunun ziyaretlerini, günlerini ve ilklerini siler (`Consent::revoke`).
- **Çıkış:** Hesaptan çıkan oyuncunun telefonundaki cevap unutulur. Aynı telefona giren bir sonraki kişiye yeniden sorulur.

## Veri şişmesine ve yoğun akışa karşı

| # | Çözüm | Nasıl |
| --- | --- | --- |
| 1 | Zaten bilineni toplama | Tur, skor, post, takip, lig analitik olayı değildir; oyunla ilgili sayılar mevcut tablolardan gelir. En büyük olası akış (post başına olay) baştan yoktur. |
| 2 | Olay değil, ziyaret özeti | Telefon bir ziyareti kendi içinde toplar. Uygulama arka plana geçince **tek istek** gider: süre, ekran yolculuğu (en çok 40 adım), olay sayıları. Olay başına bir istek yerine ziyaret başına bir istek olur. |
| 3 | Kapalı katalog | 13 ekran ve 13 an `@quezby/config`'te durur, API ile `fixtures/analytics.json` üzerinden eşlenir. Serbest metin ya da özellik yoktur. API bilmediği bir kodu atar ve `dropped` olarak sayar. |
| 4 | Sert sınırlar | İstekte ≤ 10 ziyaret, yolculukta ≤ 40 adım, kod başına ≤ 999, telefonda bekleyen ≤ 20 ziyaret, ≤ 7 günlük ziyaret, ziyaret başına ≤ 4 saat, oyuncu başına günde ≤ 50 ziyaret. İstek sınırı dakikada 12'dir. |
| 5 | İki kez sayma yok | Ziyaret kimliğini telefon üretir. `unique(user_id, client_id)` ve `insertOrIgnore` vardır. Önce ziyaret satırı yazılır, sonra sayaçlar: bir hata sayı kaybettirir ama asla çift saydırmaz. |
| 6 | Katmanlı saklama, anında özet | Sayaçlar yazılırken artar, sonradan toplu işe gerek kalmaz. Ziyaretler 30 gün (en az 8), oyuncu-günleri 90 gün kalır. Anonim günlük toplamlar süresizdir, günde birkaç düzine satır. |
| 7 | Günde bir yazma, sıfır ek G/Ç | "Bugün geldi" ve cihaz kaydı, bir token'ın **günün ilk isteğinde** bir kez yazılır. Kapı Sanctum'un zaten tuttuğu `last_used_at`'in bir önceki değeridir (`TokenAuthenticated` olayı güncellemeden önce gelir). Önbellek dosyası kullanılmaz: dosya önbelleği süresi dolanı silmez, oyuncu-gün başına bir dosya hostingin inode sınırını doldururdu. |
| 8 | Cron'suz bakım | Budama API'de, bir alım isteğinden sonra (`defer`) saatte en çok bir kez, 500 satırlık parçalarla yapılır. Tek bir önbellek anahtarı kullanır. Ayrıca `php artisan quezby:analytics:prune` (cron varsa günlük) ve panelde **Sistem → Analitiği temizle** var. |
| 9 | Vanalar ve geri çekilme | `QUEZBY_ANALYTICS_ENABLED=false` her şeyi durdurur. `QUEZBY_ANALYTICS_SAMPLE` izin verenlerin binde kaçının tutulacağını belirler; aynı oyuncular hep içeride kalır, `crc32(id)`. API `record: false` derse telefon 24 saat kaydetmez. Başarısız gönderimden sonra 60 sn beklenir. |
| 10 | Saat düzeltme | Toplu istek gönderildiği anın `sentAt` damgasını taşır. API, telefon saatinin kaymasını her ziyaretin başlangıcından düşer. |
| 11 | Transaction yok | MySQL'de `INSERT IGNORE` kilidini commit'e kadar tutar. Aynı sıcak toplamı artıran iki toplu istek kilitlenirdi. Her ifade tek başına çalışır, kovalar hep aynı sırayla yazılır. |

**Kabaca hacim** (izin veren 1.000 günlük aktif oyuncu, günde 2 ziyaret):

- Ziyaretler: 30 günde yaklaşık 60 bin satır, 30 MB.
- Oyuncu-günleri: 90 günde yaklaşık 90 bin satır, 13 MB.
- Toplamlar: yılda yaklaşık 20 bin satır, 2 MB.
- Cihaz kaydı: telefon başına bir satır, 10 bin telefonda 3 MB.
- İstek: günde yaklaşık 2.000 alım isteği. "Bugün geldi" için ek istek yok.
- Karşılaştırma: aynı oyuncularla olay başına bir satır ve istek tutan saf bir olay günlüğü, günde yaklaşık 100 bin satır ve istek demek; yılda 11 GB.

**Ölçek büyüyünce kullanılacak kollar:**

- `QUEZBY_ANALYTICS_VISIT_DAYS=14` ziyaret katmanını yarıya indirir.
- `QUEZBY_ANALYTICS_SAMPLE=250` her şeyi dörtte birine indirir.

**Asıl büyük tablo başka yerde.** Her biten tur, tüm hamle kaydını `runs.actions`'ta tutuyor (tur başına 1–5 KB). Eski sıralı turların kaydı için ayrı bir saklama kuralı ileride gerekecek; bu belge onu kapsamıyor.

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
  install=…; platform=ios; os=18.2; model=iPhone%2015; build=42
  ```

  Kurulum kimliği, token'la birlikte açılışta okunur; böylece ilk istek bile telefonu tanıtır.

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
