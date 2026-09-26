# Diller

Quezby altı dil konuşur: **Türkçe**, **İngilizce**, **Almanca**, **Arapça**,
**Fransızca** ve **İspanyolca**. Kaynak dil Türkçedir; her satır önce Türkçe
yazılır, diğer beş dil aynı değişiklikte eklenir. Sözcük seçimi ve her dilin
sesi: [ui-writing.md](../design/ui-writing.md).

> **İnceleme bekliyor.** Beş çeviri henüz anadili konuşan birinin gözünden
> geçmedi. Mağazaya çıkmadan önce her dil için bir okuma yapılmalı; özellikle
> sahte postların esprileri ve Arapça metinler.

## Oyun hangi dilde açılır?

1. **İlk açılış:** telefonun tercih ettiği diller sırayla denenir; altı dilden
   ilk eşleşen açılır (`de-AT` → Almanca). Hiçbiri değilse **İngilizce**.
   Karşılama ekranındaki küçük dil düğmesi, oynamadan önce başka dil seçtirir.
2. **Oyuncu seçerse** (Ayarlar → Dil ya da karşılamadaki düğme): seçim
   telefonda saklanır ve oyun o dilde kalır.
3. **Telefonun dili sonradan değişirse** (sistem ayarı ya da iOS / Android'in
   "uygulama dili" ayarı): bir sonraki açılışta oyun onu alır — en son söylenen
   istek kazanır.
4. **Hesap:** oyuncunun dili hesabına da yazılır (`users.locale`). Bir hesap
   ilk kez bir telefona geldiğinde — başka bir telefonda giriş, yeniden
   kurulumdan sonra keychain'den dönen oturum — oyun **hesabın dilinde**
   açılır. Ondan sonra telefon karar verir: telefonda seçilen dil hesaba
   yazılır (`PUT /me/locale`), ağ yoksa bir sonraki açılışta.

Misafir hesabın dili de kaydedilir; misafir Apple, Google ya da e-posta
bağladığında dil onunla gelir. Dillerden önceki hesaplar Türkçe sayılır.

## Sunucu

- Her istek oyunun dilini `Accept-Language` ile söyler. Sunucu hata ve
  doğrulama mesajlarını, paylaşım metnini o dilde yazar (`lang/{dil}/`).
  Başlık yoksa oyuncunun kayıtlı dili, o da yoksa Türkçe.
- Yeni hesap isteğin diliyle doğar (misafir, yeni Apple / Google hesabı).
- Admin paneli Türkçe kalır; oyuncu sayfasında ve listede oyuncunun dili
  görünür.

## Arapça: sağdan sola

- Arapça seçilince — ya da Arapçadan çıkılınca — oyun yönünü değiştirmek için
  bir kez **kapanıp yeniden açılır** (oyuncuya önce sorulur). Diğer diller
  arasında geçiş anında olur.
- Yeniden açılış tutmazsa (telefon yönü değiştirmezse) oyun döngüye girmez:
  aynı sürümde otomatik deneme bir kez yapılır, sonra oyun olduğu gibi devam
  eder.
- Düzen kendiliğinden aynalanır: satırlar, kenar boşlukları, dock'un sırası,
  podyum, çubukların dolma yönü. Yön gösteren simgeler (ok, geri, çıkış,
  grafik) elle çevrilir. Oyunun hareketleri dikeydir; iki yönde de aynıdır.
- Yazı tipi **Cairo**; harf aralığı yoktur (harfler birleşik yazılır), satırlar
  daha yüksektir. Rakamlar Latin (`12,345`).
- Kullanıcı adları ve `#12` gibi parçalar Arapça cümle içinde kendi yönlerini
  korur: iki yanlarına soldan-sağa işareti (LRM, U+200E) konur. Unicode'un
  yalıtım karakterleri (U+2066 … U+2069) kullanılmaz; iOS onları yok sayar ve
  `@ekin` `ekin@` olur. Sunucunun Arapça paylaşım satırları RLM (U+200F) ile
  başlar.

## Kod nerede

| Ne | Nerede |
| --- | --- |
| Diller, rakam gruplama, çoğul kuralları | `packages/config/src/locales.ts` (API ikizi `App\Enums\Locale`, `fixtures/locales.json` ile test edilir) |
| Uygulamanın satırları | `apps/mobile/src/i18n/messages/<alan>.ts` — altı dil yan yana; Türkçe şekli belirler, eksik satır derlenmez |
| Dil seçimi, yön, yeniden açılış | `apps/mobile/src/i18n/language.ts`, `direction.ts` |
| Hesapla eşitleme | `apps/mobile/src/hooks/useLanguageSync.ts` |
| Sayı, süre, liste biçimleri | `t.fmt` (`apps/mobile/src/i18n/format.ts`) |
| Sunucu metinleri | `apps/api/lang/{tr,en,de,ar,fr,es}/` |
| Sahte postlar | `packages/config/src/content/catalog.ts` (espri ve hesap adları dil başına) |

## Yeni bir satır

1. Satırı ekranın alanının dosyasına Türkçe yaz (`messages/<alan>.ts`).
2. Aynı değişiklikte diğer beş dile ekle — TypeScript eksik dili derletmez.
   Sayı ya da ad içeren satır her dilde bir fonksiyondur; Arapça sayılar altı
   biçimle (`plural`).
3. Ekranda `const t = useT()` ve `t.<alan>.<satır>`. Düz metin yazma (ESLint
   engeller); adı `handle(ad)` ile yaz.

## Yeni bir dil

1. `Locale`'e (packages/types) ve `LOCALES` / `LOCALE_NAMES`'e (packages/config)
   ekle; rakam gruplama ve çoğul kuralını yaz; `pnpm --filter @quezby/config
   fixtures`.
2. API: `App\Enums\Locale` ve `lang/<dil>/` dosyaları.
3. Uygulama: her `messages/*.ts` dosyasına ve `format.ts`'e dilin satırları;
   iOS `CFBundleLocalizations`, Android `res/xml/locales_config.xml`.
4. Yazı tipi dilin bütün harflerini taşımalı; sağdan sola bir dilse Arapçanın
   yolunu izler.
