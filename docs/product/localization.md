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
   ilk kez bir telefona geldiğinde — başka bir telefonda ya da yeniden
   kurulumdan sonra giriş — oyun **hesabın dilinde** açılır. Ondan sonra telefon karar verir: telefonda seçilen dil hesaba
   yazılır (`PUT /me/locale`), ağ yoksa bir sonraki açılışta.

Misafir hesabın dili de kaydedilir; misafir Apple, Google ya da e-posta
bağladığında dil onunla gelir. Dillerden önceki hesaplar Türkçe sayılır.

## Sunucu

- Her istek oyunun dilini `Accept-Language` ile söyler. Sunucu hata ve
  doğrulama mesajlarını, paylaşım metnini o dilde yazar (`lang/{dil}/`).
  Başlık yoksa oyuncunun kayıtlı dili, o da yoksa Türkçe.
- Push bildirimleri isteğin değil **alıcının** dilindedir: alıcı hesabın
  kayıtlı dili (`users.locale`), yani telefonunun hesaba en son yazdığı dil
  (`lang/{dil}/push.php`; hazır mesajın sözü `lang/{dil}/phrases.php`).
  Uygulama içinde hazır mesajı her telefon kendi dilinde gösterir: iki arkadaş
  arasında yalnızca kodu gider (`gg`, `rematch`…), söz değil.
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
  `@ekin` `ekin@` olur. Sunucunun Arapça paylaşım ve bildirim satırları RLM
  (U+200F) ile başlar.

## Kod nerede

| Ne | Nerede |
| --- | --- |
| Diller, rakam gruplama, çoğul kuralları | `packages/config/src/locales.ts` (API ikizi `App\Enums\Locale`, `fixtures/locales.json` ile test edilir) |
| Uygulamanın satırları | `apps/mobile/src/i18n/messages/<alan>.ts` — altı dil yan yana; Türkçe şekli belirler, eksik satır derlenmez |
| Arkadaşlar, mesaj kutusu, VS, geçmiş, bildirimler | `messages/friends.ts` (sekme, arama, oyuncu kartı, engellenenler), `inbox.ts` (hazır mesajlar, sohbet), `vs.ts`, `history.ts`, `push.ts` (bildirim adımı, "Bildirimler kapalı" kartı, Ayarlar → Bildirimler) |
| Hazır mesajlar | Kodları `packages/config/src/social.ts` (`PHRASES`; API ikizi `App\Enums\Phrase`, `fixtures/social.json` ile test edilir); sözleri uygulamada `messages/inbox.ts` → `phrases`, bildirimde `apps/api/lang/{dil}/phrases.php` |
| Dil seçimi, yön, yeniden açılış | `apps/mobile/src/i18n/language.ts`, `direction.ts` |
| Hesapla eşitleme | `apps/mobile/src/hooks/useLanguageSync.ts` |
| Sayı, süre, liste biçimleri | `t.fmt` (`apps/mobile/src/i18n/format.ts`) |
| Sunucu metinleri | `apps/api/lang/{tr,en,de,ar,fr,es}/` — hatalar, doğrulama, paylaşım (`share.php`), push bildirimleri (`push.php`), hazır mesajlar (`phrases.php`) |
| iOS izin metinleri | `apps/mobile/ios/Quezby/{tr,en,de,ar,fr,es}.lproj/InfoPlist.strings` — fotoğraf arşivi ve kamera (profil fotoğrafı); `Info.plist`'teki İngilizce yedektir |
| Android bildirim kanalı | `apps/mobile/android/app/src/main/res/values*/strings.xml` — "social" kanalının adı ve açıklaması; `values/` İngilizcedir |
| Sahte postlar | `packages/config/src/content/`: `posts/*.ts` ve `posts/themes/*.ts` (espriler ve formatların sözcükleri), `pools.ts` (fiş kalemleri, bildirimler), `accounts.ts` (hesap adları dil başına); kurallar `scripts/content-rules.ts`, yazarken `scripts/check-content.ts`, tekrar avı `scripts/similar-content.ts` |
| Formatların sabit sözcükleri | `apps/mobile/src/i18n/messages/game.ts` → `post` (ANKET, TOPLAM, çevrimiçi, gün ve ay kısaltmaları…) |

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
2. API: `App\Enums\Locale` ve `lang/<dil>/` dosyaları (`push.php` ve
   `phrases.php` dahil).
3. Uygulama: her `messages/*.ts` dosyasına ve `format.ts`'e dilin satırları;
   iOS `CFBundleLocalizations` ve `ios/Quezby/<dil>.lproj/InfoPlist.strings`
   (Xcode'da `InfoPlist.strings` grubuna eklenir); Android
   `res/xml/locales_config.xml` ve `res/values-<dil>/strings.xml`.
4. Yazı tipi dilin bütün harflerini taşımalı; sağdan sola bir dilse Arapçanın
   yolunu izler.
