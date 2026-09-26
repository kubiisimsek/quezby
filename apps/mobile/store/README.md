# Mağaza metinleri: App Store ve Google Play

Quezby'nin mağaza sayfası metinleri, her alan ayrı bir dosyada. Klasör düzeni
fastlane'in `deliver` (App Store) ve `supply` (Google Play) biçimindedir; ileride
elle kopyalamak yerine otomatik yüklenebilir. Sınırları
`scripts/store-listing.test.mjs` denetler (`pnpm test:scripts`, `pnpm test`).

| Dosya | Nereye | Sınır |
| --- | --- | --- |
| `app-store/tr/name.txt` | App Store Connect → App Information → Name | 30 karakter |
| `app-store/tr/subtitle.txt` | App Information → Subtitle | 30 karakter |
| `app-store/tr/keywords.txt` | Sürüm sayfası → Keywords | **100 bayt** |
| `app-store/tr/promotional_text.txt` | Sürüm sayfası → Promotional Text | 170 karakter |
| `app-store/tr/description.txt` | Sürüm sayfası → Description | 4000 karakter |
| `app-store/tr/release_notes.txt` | Sürüm sayfası → What's New | 4000 karakter |
| `app-store/en-GB/*` | English (U.K.) yerelleştirmesi, isteğe bağlı (aşağıda) | aynı |
| `google-play/tr-TR/title.txt` | Play Console → Main store listing → App name | 30 karakter |
| `google-play/tr-TR/short_description.txt` | Short description | 80 karakter |
| `google-play/tr-TR/full_description.txt` | Full description | 4000 karakter |
| `google-play/tr-TR/changelogs/1.txt` | Sürüm notları (`versionCode` 1) | 500 karakter |

## Anahtar kelime stratejisi

**App Store** aramada yalnızca adı, alt başlığı ve anahtar kelime alanını
kullanır; açıklama sıralamaya etki etmez, yalnızca indirme kararını etkiler.
Bu üç alandaki kelimeler birbiriyle birleşir. Örneğin adındaki "Refleks" ile
alandaki "oyunları", "refleks oyunları" aramasında eşleşir. Bu yüzden:

- **Ad:** marka ve oyunun fikri, *Kaydırma Refleksi*.
- **Alt başlık:** oyunun fiilleri, *kaydır*, *dokun*, *rekor*.
- **Alan (97/100 bayt):** adda ve alt başlıkta olmayan terimler. Virgülle,
  boşluksuz yazılır. Türkçe harfler (ı ş ğ ü ö ç) 2 bayt tutar; alanı karakter
  değil bayt sınırlar. Adda "Refleksi" geçse de *refleks* ve *oyunu* burada
  kök hâlleriyle durur: App Store Türkçe ekleri her zaman çözmez, en çok
  aranan "refleks oyunu" kaçmasın.

**Google Play** başlığı, kısa açıklamayı ve **uzun açıklamayı** aramada
kullanır. Uzun açıklama bilerek kısa tutuldu; *kaydır*, *post*, *refleks*,
*lig*, *sıralama* ve *arkadaş* kelimeleri cümlelerin içinde kendiliğinden
geçer. Anahtar kelime doldurmak Play politikasına aykırıdır. İki mağazada
açıklama aynıdır.

## Ses tonu

Oyunu bir arkadaşına anlatır gibi yaz: kısa, samimi, sen diliyle, düz
paragraflarla. Her özelliği sayma; açıklama oyunun ne olduğunu, Günün akışını,
ligi ve sıralamaları anlatır, gerisini oyuncu oyunda bulur.

Mağaza metinlerinde emoji yok; test de bunu denetler. (Ad, alt başlık ve
Play başlığında zaten olamaz, iki mağaza da reddeder.)

Açıklamanın son satırı ("Reklam yok. Abonelik yok. Ücret yok.") bir sözdür:
oyuna reklam, abonelik ya da uygulama içi satın alma gelirse o sürümle
birlikte bu satır da değişir.

Okuyan "bunu yapay zekâ yazmış" demesin diye şunlardan da kaçın: uzun tire,
"X değil, Y" kalıbı, büyük harfli başlıklar, madde madde listeler, üçlü sıfat
dizileri, sonda retorik soru, "deneyim", "eşsiz", "sürükleyici" gibi reklam
kelimeleri.

Bilinçli olarak kullanılmayan kelimeler:

- **reels, Instagram, TikTok, YouTube Shorts:** başkasının markası. Apple
  2.3.7'de ve Play meta veri politikasında ret sebebidir.
- **ücretsiz, bedava, en iyi, #1, 1 numara:** fiyat ya da sıralama iddiası.
  İki mağaza da yasaklar.
- **yarış:** Türkçe aramada araba yarışını çağırır, yanlış kitleyi getirir.
- **lig** (App Store alanında): futbol aramaları. Açıklamada geçmesi sorun
  değildir.
- **video:** oyunda gerçek video yok.
- **reel:** akıştan gelen her şeyin adı, uygulamada da mağazada da
  **post**'tur (`docs/design/ui-writing.md`). "Reel" Instagram'ı çağrıştırır.

## İngilizce (U.K.) yerelleştirme (isteğe bağlı)

App Store'un Türkiye vitrini Türkçenin yanında **English (U.K.)**
yerelleştirmesini de aramada kullanır. Bu, ikinci bir ad, alt başlık ve
100 baytlık alan demektir. `app-store/en-GB/` İngilizce arayanlar için yazıldı
("reaction time test", "brain", "focus"…).

Bu metni cihaz dili İngilizce olanlar görür; açıklama oyunun Türkçe olduğunu
açıkça söyler. Oyun yalnızca Türkiye'de yayınlanacaksa (Pricing and
Availability) başka ülkelerde görünmez. Google Play'de yalnızca `tr-TR`
yeterlidir.

## Kategori

- **App Store:** Primary category **Games**, alt kategoriler **Arcade** ve
  **Casual** (sırası bu: Arcade daha az kalabalık, Casual kitleyi büyütür).
  Secondary category isteğe bağlı; **Entertainment** seçilirse oyun o
  kategorinin listelerinde de görünür. Yaş derecelendirmesi anketini dürüstçe
  doldur: şiddet, kumar ve gerçek video yok.
- **Google Play:** "Game" → kategori **Arcade**. Etiketlerde (en fazla 5)
  Play'in listesinden en yakın olanları seç: Arcade, Casual, tek oyunculu,
  rekabetçi gibi. İçerik derecelendirmesi IARC anketiyle gelir.

## Ekran görüntüsü başlıkları

İndirme kararını en çok ilk üç ekran görüntüsü etkiler. Apple'ın bu yazıları
aramada okuyup okumadığı tartışmalıdır; yine de insanların aradığı kelimelerle
yazmak zarar vermez.

| Başlık | Ekran |
| --- | --- |
| Nasılsa kaydırıyorsun, bari puan topla | Oyun ekranı, akışın ortası |
| Kırmızı gelince sakın dokunma! | Kırmızı post |
| Arkadaşının postu mu? Çift dokun | Pembe post |
| Her gün aynı akış, tek hak | Günün akışı ve paylaşım kareleri |
| Haftalık ligde bir üste çık | Lig ekranı |
| Arkadaşlarını geç | Zirve podyumu |

## Yayından sonra

- **Apple Search Ads (Apple Ads):** reklam vermeden kampanya kurulumunda
  anahtar kelimelerin Türkiye'deki arama popülerliği görülür; zayıf olanları
  değiştir.
- **App Store Connect Analytics** ve **Play Console'daki arama terimleri
  raporu:** hangi aramaların indirme getirdiğini gösterir. 4–6 haftada bir
  gözden geçir.
- **Tanıtım metni (Promotional Text)** yeni sürüm gerektirmeden değişir:
  sezon ya da hafta sonu etkinliği duyurusu için kullan. Ad, alt başlık ve
  anahtar kelimeler yalnızca yeni bir sürümle değişir.

## Gizlilik etiketleri (analitik)

Uygulama, izin veren oyuncular için kullanım verisi, herkes için cihaz kaydı
tutar (`docs/product/analytics.md`). Mağaza beyanları buna uymalı:

- **App Store → App Privacy:** *Usage Data → Product Interaction* (Analytics;
  kullanıcıya bağlı; izleme için değil), *Identifiers → Device ID* ve
  *Diagnostics → Other Diagnostic Data* (App Functionality; kullanıcıya
  bağlı). Önceden beyan edilen e-posta ve kullanıcı kimliği de kalır.
  `ios/Quezby/PrivacyInfo.xcprivacy` aynı türleri beyan eder.
- **Google Play → Veri güvenliği:** *Uygulama etkinliği → Uygulama
  etkileşimleri* (toplanır, isteğe bağlı, analitik) ve *Cihaz veya diğer
  kimlikler* (toplanır, zorunlu, uygulama işlevi ve güvenlik). Veriler
  aktarılırken şifrelenir; kullanıcı silinmesini isteyebilir (Hesabı sil).
- App Tracking Transparency gerekmez: veri başka şirketlerle birleştirilmez,
  reklam için kullanılmaz.

