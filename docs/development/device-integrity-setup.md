# Cihaz doğrulaması kurulumu — App Attest ve Play Integrity

Bu rehber, kodda hazır olan cihaz doğrulamasını (anti-cheat v3) çalışır hale
getirmek için **repo dışında** yapılacakları adım adım anlatır. Kurallar ve
nedenleri: `docs/product/scoring.md` → "Hile koruması"; ortamlar:
`docs/development/environments.md`.

Uygulamanın tek kimliği var: **`com.kubisimsek.game.quezby`** (iOS bundle id =
Android paket adı). Local, staging ve production aynı kimliği kullanır; bu
yüzden aşağıdaki her kurulum **bir kez** yapılır.

## Nasıl çalışıyor (kısaca)

1. Oturum açıkken uygulama API'den tek kullanımlık bir **challenge** alır
   (`POST /api/v1/device/challenge`, 5 dakika geçerli).
2. Telefon bu challenge'a bağlı bir kanıt üretir:
   - **Android:** Google Play Integrity (standart istek), `requestHash =
     sha256(challenge)`.
   - **iOS:** App Attest. Kurulum başına bir kez anahtar onaylatılır
     (`attestKey`), sonra her kontrolde o anahtarla imza (`assertion`).
3. API kanıtı **kendisi** doğrular. Android'de Google'ın `decodeIntegrityToken`
   ucunu servis hesabıyla çağırır; iOS'ta Apple'ın sertifika zincirine,
   nonce'a, uygulama kimliğine ve sayaca bakar. Sonucu kaydeder:
   `pass` 6 saat, `fail` 12 saat geçerli; `unavailable` hiç kaydedilmez.
4. Tur başlarken oyuncunun geçerli sonucu tura yazılır (`runs.device_verdict`).
   Sonuca ne olacağını `QUEZBY_INTEGRITY_MODE` belirler:

| Mod | Nerede | Etkisi |
| --- | --- | --- |
| `log` | local, staging | Sonuç yalnızca kaydedilir, hiçbir tur etkilenmez. |
| `enforce` | production | `fail` cihazın turları sıralamaya girmez (oyun oynanır, sonuç ekranı söyler). Sonucu olmayan cihaz sıralamaya girer; zirveye çıkan skoru incelemeye düşer. |
| `off` | — | Hiçbir şey kontrol edilmez. |

Kodda yeri: uygulamada `src/lib/integrity.ts`, `src/auth/deviceCheck.ts`,
`src/hooks/useDeviceCheck.ts` ve yerel modüller
(`android/app/src/main/java/com/kubisimsek/game/quezby/integrity/`,
`ios/Quezby/QuezbyIntegrity.m`). API'de `app/Services/Integrity/*` ve
`DeviceController`.

## Gereken değerler ve gittikleri yer

| Değer | Nereden | Nereye |
| --- | --- | --- |
| Apple **Team ID** (10 karakter) | developer.apple.com → Account → Membership details | Her API ortamında `APPLE_TEAM_ID`; Xcode'da Team seçimi |
| Google Cloud **proje numarası** (yalnız rakam) | Cloud Console → proje ana sayfası → Project info → *Project number* | `apps/mobile/.env` → `GOOGLE_CLOUD_PROJECT_NUMBER` |
| Servis hesabı **JSON anahtarı** | Cloud Console → IAM & Admin → Service Accounts → Keys | Sunucuda `storage/app/private/play-integrity.json`, yolu `GOOGLE_PLAY_INTEGRITY_CREDENTIALS`'ta |
| Play **yükleme anahtarı** (keystore) | Kendin üretirsin (aşağıda) | Bilgisayarında, `~/.gradle/gradle.properties` yolunu gösterir |

Proje numarası ve Team ID gizli değildir. JSON anahtarı ve keystore ise
**gizlidir**: repoya, zip'e ya da `public/` altına asla girmez.

---

## 1. iOS — App Attest

### 1.1 Apple Developer'da App ID

1. [developer.apple.com](https://developer.apple.com/account) → **Certificates,
   Identifiers & Profiles** → **Identifiers**.
2. `com.kubisimsek.game.quezby` yoksa **+** → *App IDs* → *App* → Bundle ID
   **Explicit**: `com.kubisimsek.game.quezby`, açıklama "Quezby".
3. **Capabilities** listesinde **App Attest** ve **Sign in with Apple**
   işaretli olsun → *Save*.
4. Daha önce `….local` / `….staging` App ID'leri açtıysan artık
   kullanılmıyorlar; silebilir ya da bırakabilirsin.

### 1.2 Xcode'da imzalama

1. `open apps/mobile/ios/Quezby.xcworkspace` (proje değil, **workspace**).
2. Hedef **Quezby** → **Signing & Capabilities** → *Automatically manage
   signing* açık, **Team**: kendi takımın. Bu, projeye `DEVELOPMENT_TEAM`
   yazar; `project.pbxproj` değişikliğini commit'le.
3. Listede **App Attest** ve **Sign in with Apple** görünmeli. İkisi de
   `Quezby/Quezby.entitlements` içinde hazır. App Attest ortamı bir build
   ayarından gelir: Debug → `development`, Release → `production`
   (TestFlight ve App Store her zaman production'dır).

### 1.3 API'ye Team ID

Her ortamın API `.env`'inde (`apps/api/.env`, sunucudaki staging ve production):

```dotenv
APPLE_TEAM_ID=A1B2C3D4E5
APPLE_BUNDLE_IDS=                    # boş = com.kubisimsek.game.quezby
APP_ATTEST_ENVIRONMENTS=development,production   # production'da yalnızca: production
```

`APPLE_TEAM_ID` boşsa iOS kontrolleri `unavailable` döner (log'da: *App Attest
proofs are not checked*). Sunucuda `.env` değişince config önbelleğini yenile
(`docs/deployment/shared-hosting.md` → `/ops/optimize`).

### 1.4 Gerçek iPhone'da deneme

Simülatör App Attest desteklemez; orada cihaz hep "doğrulanmamış" kalır ve bu
beklenen bir durumdur.

1. iPhone'u Mac'e bağla. **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu**
   açık olsun.
2. `pnpm switch-local` (ya da `switch-staging`), sonra `pnpm dev:api`.
3. `pnpm ios --device` ya da Xcode'da hedef olarak iPhone'u seçip **Run**.
   Local API'ye telefon, Metro'nun çalıştığı Mac'in IP'siyle ulaşır (aynı
   Wi-Fi, ayar gerekmez).
4. Uygulamayı aç, giriş yap. Birkaç saniye içinde kontrol yapılır:

   ```bash
   sqlite3 apps/api/database/database.sqlite \
     "select platform, verdict, reason, checked_at from device_checks order by id desc limit 5;"
   sqlite3 apps/api/database/database.sqlite \
     "select environment, counter, attested_at from app_attest_keys order by id desc limit 3;"
   ```

   Beklenen: `ios | pass`, anahtar ortamı `development`. Sunucuda aynı
   sorguları phpMyAdmin'de çalıştır.

### 1.5 TestFlight ve App Store

- Release derlemesi otomatik olarak production ortamını kullanır. Production
  API'de `APP_ATTEST_ENVIRONMENTS=production` olmalı.
- Bu yüzden production API'ye bağlı bir **Debug** derleme `environment`
  gerekçesiyle `fail` alır ve `enforce` modunda turları sıralamaya girmez. Bu
  bilinçli bir tercih.
- Uygulama silinip yeniden kurulursa anahtar yenilenir. API anahtarı
  tanımazsa `409 attest_key_unknown` döner, uygulama da kendiliğinden yeni
  anahtar onaylatır.

---

## 2. Android — Play Integrity

Play Integrity, `PLAY_RECOGNIZED` sonucunu **yalnızca Google Play'den kurulan**
bir derlemeye verir; iç test (internal testing) de sayılır. Android Studio'dan
ya da `pnpm android` ile kurulan derleme bu kontrolden kalır. Local ve
staging'in `log` modunda çalışmasının nedeni bu.

### 2.1 Yükleme anahtarı (bir kez)

```bash
mkdir -p ~/keys
keytool -genkeypair -v -storetype PKCS12 -keystore ~/keys/quezby-upload.jks \
  -alias quezby-upload -keyalg RSA -keysize 2048 -validity 10000
```

`~/.gradle/gradle.properties` dosyasına (repo dışı) şunu ekle:

```properties
QUEZBY_UPLOAD_STORE_FILE=/Users/kubilay/keys/quezby-upload.jks
QUEZBY_UPLOAD_STORE_PASSWORD=…
QUEZBY_UPLOAD_KEY_ALIAS=quezby-upload
QUEZBY_UPLOAD_KEY_PASSWORD=…
```

`android/app/build.gradle` bunları görünce release derlemesini bu anahtarla
imzalar; görmezse debug anahtarıyla imzalar (Play kabul etmez). Keystore
dosyasını ve şifreleri **yedekle**: kaybolursa yükleme anahtarını sıfırlamak
için Play desteğine başvurman gerekir.

Google ile girişin Android istemcisi bu anahtarın SHA-1'ini ister:
`keytool -list -v -keystore ~/keys/quezby-upload.jks -alias quezby-upload`.

### 2.2 Play Console'da uygulama ve ilk iç test

1. [play.google.com/console](https://play.google.com/console) → **Create app**:
   ad *Quezby*, varsayılan dil Türkçe, tür **Game**, ücretsiz.
2. Derle (sürüm numarası her yüklemede artmalı: `android/app/build.gradle` →
   `versionCode`):

   ```bash
   pnpm android:bundle:staging         # iç test staging API'ye bağlansın
   # → dist-deploy/quezby-android-staging-<sürüm>-<versionCode>-<zaman>.aab
   ```

   Betik yükleme anahtarını kontrol eder (yoksa derlemez), `versionCode`'u
   iki platformun da üstüne çıkarır (`--version-code N` ile elle), imzanın
   debug değil yükleme anahtarı olduğunu doğrular ve `.env`'i eski haline
   getirir. Elle: `pnpm switch-staging`, sonra
   `cd apps/mobile/android && ./gradlew bundleRelease`
   (→ `app/build/outputs/bundle/release/app-release.aab`).

3. **Test and release → Testing → Internal testing** → *Create new release*
   → `.aab`'yi yükle. Paket adı ilk yüklemede `com.kubisimsek.game.quezby`
   olarak kilitlenir ve bir daha değişmez.
4. **Testers** sekmesinde kendi Gmail adresinle bir liste aç, sürümü yayınla,
   katılım (opt-in) bağlantısını telefonda açıp uygulamayı **Play Store'dan**
   kur.
5. Play App Signing yeni uygulamalarda varsayılan olarak açık gelir: Google
   dağıtılan paketi kendi anahtarıyla imzalar, sen yükleme anahtarıyla
   yüklersin.

### 2.3 Google Cloud projesi ve Play Integrity API

Google ile giriş için açtığın Cloud projesini kullanabilirsin; aynı proje
olması işleri kolaylaştırır.

1. [console.cloud.google.com](https://console.cloud.google.com) → projeyi seç
   → **APIs & Services → Enable APIs and services** → *Play Integrity API* →
   **Enable**.
2. Projenin **Project number**'ını not al (Project info kartı; *Project ID*
   değil, yalnızca rakamlardan oluşan numara).
3. Play Console → uygulaman → **Protected with Play** → *Play Integrity API*
   yanında **Get started** → **Link Cloud project** → bu projeyi seç.

### 2.4 Servis hesabı (API tokenları çözsün diye)

1. Cloud Console → **IAM & Admin → Service Accounts → Create service account**:
   ad `play-integrity`. Rol vermen gerekmez; bağlı projedeki bir hesap
   olması yeter.
2. Hesabı aç → **Keys → Add key → Create new key → JSON** → dosya iner.
3. Local: `apps/api/storage/app/private/play-integrity.json` (bu klasör git'e
   girmez). Sunucu: cPanel File Manager ile aynı yola yükle, zip'e koyma.
4. Her ortamın API `.env`'i:

   ```dotenv
   GOOGLE_PLAY_INTEGRITY_CREDENTIALS=storage/app/private/play-integrity.json
   PLAY_INTEGRITY_PACKAGES=             # boş = com.kubisimsek.game.quezby
   ```

5. Hostun şu adreslere HTTPS çıkışı açık olmalı: `oauth2.googleapis.com` ve
   `playintegrity.googleapis.com` (cPanel Terminal:
   `curl -I https://playintegrity.googleapis.com`).

Kurumsal bir Google hesabında anahtar oluşturma politika ile kapalı olabilir
(`iam.disableServiceAccountKeyCreation`). Kişisel Gmail hesabında bu engel
yoktur.

### 2.5 Uygulamaya proje numarası

`apps/mobile/.env`:

```dotenv
GOOGLE_CLOUD_PROJECT_NUMBER=123456789012
```

Bu numara her ortamda aynıdır (Play'deki tek uygulamaya bağlı tek proje).
Sonra `pnpm switch-<ortam>` çalıştır ve Metro'yu yeniden başlat. Numara boşsa
Android kontrolü hiç yapılmaz ve cihaz "doğrulanmamış" kalır.

### 2.6 Deneme

1. Proje numarasını içeren yeni bir `.aab` derle ve iç teste yükle, sonra
   **Play'den** güncelle.
2. Giriş yap, uygulamayı birkaç saniye açık tut. Staging veritabanında
   `device_checks` → `android | pass` olmalı.
3. Aynı derlemeyi Android Studio'dan kurarsan `fail` ve `reason = app` gelir.
   Bu beklenen bir durum.

---

## 3. Ortam başına API ayarları

| Değişken | local | staging | production |
| --- | --- | --- | --- |
| `QUEZBY_INTEGRITY_MODE` | `log` | `log` | `enforce` |
| `APPLE_TEAM_ID` | Team ID | Team ID | Team ID |
| `APP_ATTEST_ENVIRONMENTS` | `development,production` | `development,production` | `production` |
| `GOOGLE_PLAY_INTEGRITY_CREDENTIALS` | isteğe bağlı | `storage/app/private/play-integrity.json` | `storage/app/private/play-integrity.json` |
| `APPLE_BUNDLE_IDS`, `PLAY_INTEGRITY_PACKAGES` | boş | boş | boş |

Sunucuda `.env` her değiştiğinde `/ops/optimize` çalıştır.

## 4. Yayına geçiş sırası

1. Apple: App ID yetenekleri, Xcode'da Team, her API'de `APPLE_TEAM_ID`.
2. Play: yükleme anahtarı, uygulama, ilk iç test.
3. Cloud: Play Integrity API, Play Console bağlantısı, servis hesabı ve JSON'u
   sunucuya.
4. Mobil `.env`'e proje numarası, yeni iç test derlemesi.
5. Staging `log` modunda birkaç gün izle:

   ```sql
   select platform, verdict, reason, count(*) from device_checks
   group by platform, verdict, reason order by 4 desc;
   ```

   Gerçek oyuncularda beklenmedik `fail` görürsen önce 5. bölüme bak.
6. Production: `QUEZBY_INTEGRITY_MODE=enforce`, `APP_ATTEST_ENVIRONMENTS=production`,
   `/ops/optimize`.

## 5. Sorun giderme

`device_checks.reason` ve `storage/logs/laravel.log` ("App Attest proof refused: …",
"Play Integrity token refused: …") sebebi söyler.

| Belirti / reason | Anlamı | Çözüm |
| --- | --- | --- |
| iOS hep doğrulanmamış | Simülatör, ya da `APPLE_TEAM_ID` boş (`not_configured`) | Gerçek cihaz; Team ID'yi gir, `/ops/optimize` |
| iOS `app_id` | Team ID ya da bundle id tutmuyor | Team ID'yi Membership sayfasından kopyala |
| iOS `environment` | Debug (development) anahtarı production API'ye geldi | Beklenen; production'da TestFlight/App Store derlemesi kullan |
| iOS `counter`, `signature`, `nonce`, `chain`, `key_id`, `credential_id`, `format` | Kanıt bozuk ya da tekrar oynatılmış | Gerçek cihazda görülmez; sürerse log'daki ayrıntıya bak |
| iOS `409 attest_key_unknown` | API anahtarı tanımıyor (veritabanı sıfırlanmış, başka sunucu) | Bir şey yapma, uygulama yeni anahtar onaylatır |
| Android hep doğrulanmamış | `GOOGLE_CLOUD_PROJECT_NUMBER` boş, Play Hizmetleri yok (ör. Huawei) ya da JSON ayarlanmamış (log: *not checked*) | Numarayı gir; JSON'u yükle |
| Android `app` | Uygulama Play'den kurulmamış ya da değiştirilmiş | İç testten kur |
| Android `device` | Root, emülatör, açık bootloader, özel ROM | Beklenen: sıralama dışı |
| Android `package` | Token başka paket için | `PLAY_INTEGRITY_PACKAGES`'ı boş bırak |
| Android `stale` | Token 10 dakikadan eski (telefon saati çok kaymış) | Telefon saatini otomatiğe al |
| Android `hash` | Token bu challenge için üretilmemiş | Gerçek cihazda görülmez |
| Log: *Google Play Integrity could not decode a token* (403) | Proje Play Console'a bağlı değil, API kapalı ya da servis hesabı başka projede | 2.3 ve 2.4'ü kontrol et |

## 6. Kota ve maliyet

- Play Integrity ücretsizdir. Varsayılan kota günde **10.000 token isteği** ve
  **10.000 çözümlemedir**. Bir sonuç 6 saat geçerli olduğu için aktif bir
  oyuncu günde 1–4 kontrol yapar; varsayılan kota birkaç bin günlük aktif
  oyuncuya yeter. Yayından önce Google'ın kota artırma formundan artış iste;
  bunun için uygulamanın Play'de yayında olması gerekir.
- App Attest ücretsizdir. Uygulama kurulum başına bir kez anahtar onaylatır,
  sonrası yalnızca imzadır. Apple, çok büyük kitlelerde kademeli açılım
  öneriyor.
