# Push bildirimleri kurulumu — Firebase Cloud Messaging

Bu rehber, kodda hazır olan push bildirimlerini çalışır hale getirmek için
**repo dışında** yapılacakları adım adım anlatır. Neyin ne zaman gittiği:
`docs/backend/api-contract.md` → *Push*; ortamlar:
`docs/development/environments.md`.

Uygulamanın tek kimliği var: **`com.kubisimsek.game.quezby`** (iOS bundle id =
Android paket adı). Bu yüzden **tek bir Firebase projesi — `quezby-staging` —
her ortama hizmet eder**: uygulama tek bir Firebase dosyası taşır, telefonların
push token'ları o projeye aittir; production API de bu projenin kimliğiyle ve
bu projeden bir anahtarla gönderir. Adındaki "staging"e aldanma; production
için ayrı bir Firebase projesi açma. Aşağıdaki her kurulum **bir kez** yapılır.

## Nasıl çalışıyor (kısaca)

1. **Telefon izin verir.** Yeni oyuncunun ilk adımlarında, addan sonra
   **Bildirimler** adımı sorar: "Haberin olsun mu?" → **Bildirimleri aç**
   telefonun kendi sorusunu getirir. Adım yalnızca soru hâlâ sorulabiliyorsa
   görünür. Hayır diyen oyuncuya Mesajlar sekmesi, bir sohbet ve az önce
   gönderilen VS bir kartla yeniden sorar; telefon artık sormuyorsa kart
   telefonun ayarlarını açar. Türler **Ayarlar → Bildirimler**'dedir.
2. **Token API'ye gider.** Firebase'in otomatik başlatması kapalıdır
   (`apps/mobile/firebase.json` → `messaging_auto_init_enabled: false`): izin
   gelmeden hiçbir token üretilmez. İzinden sonra uygulama FCM token'ını alır
   ve `PUT /api/v1/me/push-token` ile gönderir — girişte, Firebase yeni token
   verdiğinde, oyuncu telefonun ayarlarından izinle döndüğünde. Çıkışta
   `DELETE` eder ve token'ı telefondan da siler. Bir oyuncunun en son kayıtlı
   10 telefonu tutulur.
3. **API gönderir.** Bir şey olunca `PushService` metni **alıcının** dilinde
   yazar (`lang/{dil}/push.php`) ve yanıt gittikten sonra gönderir (`defer()`;
   kuyruk ve cron yok): servis hesabının anahtarıyla imzalı bir JWT'yi
   `oauth2.googleapis.com`'da bir erişim token'ına çevirir (yaklaşık 50 dakika
   önbellekte), sonra alıcının her telefonu için
   `POST https://fcm.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/messages:send`.
4. **Firebase iletir.** Android'e kendisi, iPhone'a Apple'ın APNs'i üzerinden
   — bunun için APNs anahtarı Firebase'e yüklenir. Firebase'in artık
   tanımadığı token'ı (uygulama silinmiş) API sessizce siler.
5. **Telefon gösterir.** Oyun kapalıyken ya da arka plandayken sistem gösterir:
   Android'de "social" kanalında, arkadaş başına tek bildirim; iOS'ta arkadaş
   başına gruplanır. Dokununca istek arkadaş listesini, gerisi o arkadaşın
   sohbetini açar. Oyun açıkken sistem göstermez; üstte kısa bir şerit çıkar,
   dokununca aynı yer açılır.

| Olay | Kime | Ayar |
| --- | --- | --- |
| Arkadaşlık isteği geldi | istenen oyuncu | `pushFriends` |
| İstek kabul edildi | isteyen oyuncu | `pushFriends` |
| VS geldi (skor gizli) | VS'in gönderildiği arkadaş | `pushVs` |
| VS bitti: kazandın, kaybettin ya da berabere, iki skorla | VS'i gönderen | `pushVs` |
| Hazır mesaj | mesajın gittiği arkadaş — aynı arkadaştan 5 dakikada en fazla bir push, gerisi mesaj kutusunda bekler | `pushMessages` |

Reddedilen ya da süresi dolan VS yalnızca mesaj kutusuna düşer. Yasaklı bir
oyuncunun yaptığı hiçbir şey push göndermez; yasaklı oyuncuya da push gitmez.

Kodda yeri: uygulamada `src/lib/push.ts`, `src/hooks/usePush.ts`,
`src/stores/push.ts`, `src/screens/onboarding/NotificationsScreen.tsx`,
`src/components/PushNudge.tsx` ve `NotificationsSheet.tsx`, `firebase.json`;
yerel kodda `ios/Quezby/AppDelegate.swift` (Firebase'i başlatır) ve
`android/app/src/main/java/com/kubisimsek/game/quezby/MainApplication.kt`
(kanal). API'de `app/Services/Push/PushService.php`,
`app/Services/Google/ServiceAccountToken.php` ve `PushTokenController`.

## Gereken değerler ve gittikleri yer

| Değer | Nereden | Nereye |
| --- | --- | --- |
| Firebase **proje kimliği** (`quezby-staging`) | Firebase konsolu → ⚙ Project settings → General → *Project ID* | Her API ortamında `FIREBASE_PROJECT_ID` |
| `GoogleService-Info.plist` | Firebase → iOS uygulaması (1.2) | `apps/mobile/ios/Quezby/GoogleService-Info.plist` |
| `google-services.json` | Firebase → Android uygulaması (1.3) | `apps/mobile/android/app/google-services.json` |
| APNs **anahtarı** (`.p8`) ve **Key ID** | developer.apple.com → Keys (2.2) | Firebase → Project settings → Cloud Messaging (2.3) |
| Apple **Team ID** (10 karakter) | developer.apple.com → Account → Membership details | Firebase'e, anahtarla birlikte |
| Servis hesabı **JSON anahtarı** | Google Cloud → IAM & Admin → Service Accounts → Keys (3.2) | Sunucuda `storage/app/private/firebase-push.json`, yolu `FIREBASE_CREDENTIALS`'ta |

Proje kimliği ve iki uygulama dosyası gizli değildir — dosyalar uygulamanın
içine girer —, yine de `apps/mobile/.env` gibi repoya girmezler
(`.gitignore`). APNs anahtarı ve JSON anahtarı **gizlidir**: repoya, zip'e ya
da `public/` altına asla girmez.

---

## 1. Firebase projesi ve iki uygulama

### 1.1 Proje

1. [console.firebase.google.com](https://console.firebase.google.com) →
   `quezby-staging`. Yeni kuruyorsan **Create a project** → ad
   `quezby-staging`; Google Analytics'i açma: uygulama Firebase'i yalnızca
   push için kullanır.
2. ⚙ **Project settings → General** → *Project ID*: `quezby-staging`. Her API
   ortamının `FIREBASE_PROJECT_ID`'si bu.

### 1.2 iOS uygulaması

1. Project Overview → **Add app** → **iOS+** (Apple). Bundle ID
   `com.kubisimsek.game.quezby`, takma ad "Quezby iOS" → **Register app**.
2. **Download GoogleService-Info.plist** →
   `apps/mobile/ios/Quezby/GoogleService-Info.plist`.
3. Sihirbaz dosyayı Xcode'a sürüklemeni ister: **sürükleme**. Hedefin
   **Copy Firebase config** build aşaması dosyayı bu yoldan uygulamaya
   kopyalar, `AppDelegate.swift` Firebase'i yalnızca dosya uygulamadaysa
   başlatır. Projeye eklenen dosya `project.pbxproj`'a git'te olmayan bir yol
   yazar; dosyası olmayan her derleme kırılır.
4. Kalan adımları (SDK ekleme, başlatma kodu) atla: pod'lar
   (`@react-native-firebase/app` ve `messaging`) ve `FirebaseApp.configure()`
   hazır.

### 1.3 Android uygulaması

1. **Add app** → **Android** → paket adı `com.kubisimsek.game.quezby`, takma ad
   "Quezby Android". SHA-1 push için gerekmez → **Register app**.
2. **Download google-services.json** →
   `apps/mobile/android/app/google-services.json`.
3. Kalan adımları atla: `android/build.gradle` `com.google.gms:google-services`
   eklentisini taşır, `android/app/build.gradle` onu yalnızca bu dosya varken
   uygular.

### 1.4 Dosyalarla derle

İki dosya yerindeyken `pnpm ios` / `pnpm android`: dosyalar yerel kaynaktır,
Metro'yu yeniden başlatmak yetmez, yeniden derle. Mağaza derlemesi (Xcode →
Archive, `./gradlew bundleRelease`) de dosyaları derleyen makinede bulmalı;
yoksa mağazaya push'suz bir sürüm gider.

Dosya yoksa derleme yine başarılıdır, push'suz: Xcode *ios/Quezby/GoogleService-Info.plist
is missing: this build has no push notifications* uyarısı verir, Android
sessizce derler. Uygulamada bildirim adımı görünmez; **Ayarlar →
Bildirimler** "Bu sürümde bildirimler henüz açık değil." der.

Firebase pod olarak gelir: uygulama pod'larını statik kütüphane olarak
bağlar, Firebase'in Swift paketleri bunu desteklemez. Bu yüzden `ios/Podfile`
`$RNFirebaseDisableSPM = true` der ve Firebase pod'larına `modular_headers`
verir. Google, Ekim 2026'dan sonra Firebase'in yeni sürümlerini CocoaPods'a
yayımlamıyor
([Migrate from CocoaPods](https://firebase.google.com/docs/ios/cocoapods-deprecation)):
`Podfile.lock`'taki sürümler kurulmaya ve çalışmaya devam eder, daha yeni bir
Firebase Swift Package Manager'a geçmeyi gerektirir.

---

## 2. iOS — APNs

### 2.1 App ID'de Push Notifications

1. [developer.apple.com](https://developer.apple.com/account) → **Certificates,
   Identifiers & Profiles** → **Identifiers** → `com.kubisimsek.game.quezby` →
   **Capabilities** → **Push Notifications** işaretle → **Save**. Yanındaki
   sertifika adımlarını (Configure) atla: sertifika değil, anahtar kullanılır.
2. Xcode → hedef **Quezby** → **Signing & Capabilities**: listede **Push
   Notifications** görünmeli. `aps-environment` `Quezby/Quezby.entitlements`
   içinde hazırdır ve `APS_ENVIRONMENT` build ayarından gelir: Debug →
   `development` (APNs sandbox), Release → `production` (TestFlight ve App
   Store her zaman production). Otomatik imzalama profili yeniler.

### 2.2 APNs anahtarı

1. **Keys** → **+** → ad "Quezby APNs" → **Apple Push Notifications service
   (APNs)** işaretle → **Configure**: Environment **Sandbox & Production**, Key
   Restriction **Team Scoped (All Topics)** → **Save** → **Continue** →
   **Register**. Debug derlemeler sandbox'ı, TestFlight ve App Store
   production'ı kullanır; tek anahtar ikisini de taşısın.
2. **Download**: `AuthKey_<KEY_ID>.p8` yalnızca **bir kez** iner; güvenli bir
   yerde sakla. **Key ID** (10 karakter) bu sayfada, **Team ID** Membership
   details'ta.
3. Sign in with Apple'ın anahtarı (`APPLE_KEY_ID`) ayrı bir anahtardır; APNs
   için bu yeni anahtarı kullan.

### 2.3 Anahtarı Firebase'e yükle

Firebase → ⚙ **Project settings** → **Cloud Messaging** → **Apple app
configuration** → Quezby iOS → **APNs Authentication Key** → **Upload**:
`.p8`, Key ID, Team ID. Anahtar bizim sunucumuza gitmez; onu Firebase tutar.

---

## 3. Sunucu — servis hesabı ve API

### 3.1 Firebase Cloud Messaging API (V1)

Firebase → ⚙ **Project settings** → **Cloud Messaging** → **Firebase Cloud
Messaging API (V1)**: *Enabled* olmalı. Değilse yanındaki ⋮ → **Manage API in
Google Cloud Console** → **Enable**. API eski "Legacy" uç noktasını kullanmaz.

### 3.2 Servis hesabı ve JSON anahtarı

1. [console.cloud.google.com](https://console.cloud.google.com) → proje
   `quezby-staging` (Firebase projesi aynı zamanda bir Cloud projesidir) →
   **IAM & Admin → Service Accounts → Create service account**: ad
   `quezby-push`.
2. **Grant this service account access to project** → rol **Firebase Cloud
   Messaging API Admin** → **Done**. Başka rol gerekmez.
3. Hesabı aç → **Keys → Add key → Create new key → JSON** → dosya iner.
4. Local: `apps/api/storage/app/private/firebase-push.json` (bu klasör git'e
   girmez). Sunucu: cPanel File Manager ile aynı yola yükle, zip'e koyma.
   Staging ve production aynı anahtarı ya da bu projeden ayrı anahtarlar
   kullanabilir.

Firebase konsolundaki **Service accounts → Generate new private key** de bir
anahtar verir, ama o hesabın (firebase-adminsdk) projede çok daha geniş yetkisi
var; yalnızca FCM'e yetkili bu hesap yeter. Kurumsal bir Google hesabında
anahtar oluşturma politikayla kapalı olabilir
(`iam.disableServiceAccountKeyCreation`); kişisel Gmail hesabında bu engel
yoktur.

### 3.3 API ortamı

Her ortamın API `.env`'i (`apps/api/.env`, sunucudaki staging ve production):

```dotenv
QUEZBY_PUSH_ENABLED=true
FIREBASE_PROJECT_ID=quezby-staging
FIREBASE_CREDENTIALS=storage/app/private/firebase-push.json
```

`FIREBASE_CREDENTIALS` mutlak ya da API köküne göre bir yoldur. Üçünden biri
eksikse ya da anahtar okunamıyorsa API hiçbir şey göndermez; başka hiçbir şey
de bozulmaz. Sunucuda `.env` değişince config önbelleğini yenile:
`/ops/optimize` ya da panel → **Sistem → Önbelleği yenile**
(`docs/deployment/shared-hosting.md`).

### 3.4 Çıkış ve panel

1. Hostun iki adrese HTTPS çıkışı açık olmalı. cPanel Terminal:

   ```bash
   curl -I https://oauth2.googleapis.com
   curl -I https://fcm.googleapis.com
   ```

   Bir HTTP yanıtı (404 bile) çıkışın açık olduğunu söyler; zaman aşımı kapalı
   olduğunu.
2. Panel → **Sistem** (Sahip rolü): "Push bildirimleri (Firebase)" satırı
   **Açık** olmalı — anahtar açık, proje kimliği dolu, JSON okunabiliyor
   demektir. Google'ın anahtarı kabul edip etmediğini ilk gönderim söyler:
   sorun `storage/logs/laravel-<tarih>.log`'a yazılır (7. bölüm).

---

## 4. Deneme

Uçtan uca deneme iki hesap ister: biri bildirimi alacak telefonda, öteki
gönderen (başka bir cihaz, simülatör ya da emülatör; gönderenin push'u
gerekmez). İkisi aynı API'ye bağlı olsun. Gönderenden alıcıya arkadaşlık
isteği gönder, alıcı kabul etsin (gönderene push), VS at, hazır mesaj gönder:
tablodaki her olay bir push'tur.

### 4.1 Android emülatörü

1. Android Studio → Device Manager → **Google Play**'li bir sistem imajı (Google
   Play Hizmetleri olan). API 33 ve üstünde izin sorusunu da görürsün.
2. `pnpm switch-local`, `pnpm dev:api`, `pnpm android`. `apps/api/.env`'de
   3.3'teki üç değer olsun.
3. Yeni oyuncu olarak gir: deneme turu → ad → **Bildirimleri aç** → izin ver
   (var olan bir hesapta: **Ayarlar → Bildirimler → Bildirimlere izin ver**).
   Token API'ye gitti mi:

   ```bash
   sqlite3 apps/api/database/database.sqlite \
     "select platform, app_version, updated_at from push_tokens order by id desc limit 3;"
   ```

4. Öteki hesaptan bu oyuncuya istek gönder: emülatörde
   "@ad sana arkadaşlık isteği gönderdi." görünmeli. Uygulama açıksa sistem
   bildirimi yerine üstte şerit çıkar.

### 4.2 Gerçek iPhone

Uçtan uca iOS denemesi gerçek bir iPhone'da yapılır; simülatör bunun için
kullanılmaz.

1. `docs/development/device-integrity-setup.md` → 1.4'teki gibi: Geliştirici
   Modu açık, `pnpm ios --device` ya da Xcode'da hedef olarak iPhone → **Run**.
   Debug derleme APNs sandbox'ına bağlanır; anahtarın *Sandbox & Production*
   olması bu yüzden.
2. 4.1'in 3–4. adımları (token satırında `platform = ios`).
3. TestFlight derlemesi production APNs'e bağlanır; aynı anahtar onu da
   taşır. Staging veritabanında aynı sorguyu phpMyAdmin'de çalıştır.

### 4.3 Simülatörde dokunma yönlendirmesi

Simülatörde bildirimin görünüşünü ve dokununca açılan ekranı
`xcrun simctl push` ile dene; bildirim Firebase'e hiç uğramaz. Yük, FCM'in
bıraktığı `gcm.message_id` anahtarını taşımalı: uygulama (React Native
Firebase) yalnızca onu taşıyan bildirimi kendinin sayar. Uygulama önce
bildirimlere izin vermiş olmalı; `username` bir arkadaşın adı olsun.

```bash
cat > /tmp/quezby-push.apns <<'JSON'
{
  "aps": { "alert": { "title": "Quezby", "body": "@ekin: İyi oyundu! 👏" }, "sound": "default" },
  "gcm.message_id": "yerel-deneme",
  "kind": "phrase",
  "username": "ekin"
}
JSON
xcrun simctl push booted com.kubisimsek.game.quezby /tmp/quezby-push.apns
```

- Uygulama arka plandayken sistem gösterir. Dokununca `friend_request`
  arkadaş listesini (Profil'den açılan `Friends` ekranı), `friends`,
  `vs_invite`, `vs_result` ve `phrase` o
  oyuncunun sohbetini açar.
- Uygulama açıkken üstte şerit çıkar; dokununca aynı yer açılır.

---

## 5. Ortam başına ayarlar

| | local | staging | production |
| --- | --- | --- | --- |
| Uygulamadaki iki Firebase dosyası | isteğe bağlı | aynı iki dosya | aynı iki dosya |
| APNs ortamı (derlemeden) | Debug → `development` | TestFlight (Release) → `production` | App Store (Release) → `production` |
| `QUEZBY_PUSH_ENABLED` | `true` | `true` | `true` |
| `FIREBASE_PROJECT_ID` | isteğe bağlı: `quezby-staging` | `quezby-staging` | `quezby-staging` |
| `FIREBASE_CREDENTIALS` | isteğe bağlı | `storage/app/private/firebase-push.json` | `storage/app/private/firebase-push.json` (bu projeden bir anahtar) |

Sunucuda `.env` her değiştiğinde `/ops/optimize` çalıştır.

## 6. Yayına geçiş sırası

1. Firebase: proje, iki uygulama; dosyalar derleyen makinede (1).
2. Apple: App ID'de Push Notifications, APNs anahtarı Firebase'de (2).
3. Cloud: FCM API (V1) açık, servis hesabı, JSON'u sunucuya (3.1–3.2).
4. Staging: üç değer, `/ops/optimize`, Sistem'de **Açık**; iç test ve
   TestFlight derlemeleriyle 4. bölümdeki deneme.
5. Production: aynı üç değer — aynı proje, bu projeden bir anahtar —,
   `/ops/optimize`.

## 7. Sorun giderme

En hızlı deneme panelden: **Push bildirimleri → Yeni bildirim** (Sahip) →
mesajı yaz → *Kime → Tek oyuncu*'ya oyuncunun adını yaz → *Önizle ve
gönder*. Alıcılar kartı oyuncunun push
alabilecek cihazı olup olmadığını hemen söyler (0 cihaz: token API'ye hiç
ulaşmamış). Gönderilenler tablosunda *Firebase ne dedi* sütunu her hatayı
sayısıyla gösterir: `UNAUTHENTICATED · THIRD_PARTY_AUTH_ERROR` (iOS'ta APNs
anahtarı), `PERMISSION_DENIED` (servis hesabı ya da proje), `NOT_FOUND ·
UNREGISTERED` (uygulama silinmiş; cihaz düşer).

Sonra bakılacak yer panelin **Loglar** sayfası (Sahip ve Moderatör). Alıcı
oyuncunun loglarını aç (kayıttaki oyuncu adı → *Bu oyuncunun logları*):

- **Push → Cihaz kaydedildi** hiç yoksa telefonun token'ı API'ye hiç
  ulaşmamış (bu satır yalnızca yeni cihazda, hesap ya da sürüm değişince
  yazılır; bilgi satırları 3 gün durur — daha eskisi için üstteki sayılara
  bak). Aynı oyuncuda **Telefon** kaynağına bak: *Push token alınamadı*
  (Firebase token vermedi; iOS'ta çoğunlukla APNs), *Token API'ye gitmedi*,
  *Bu sürümde Firebase yok*.
- **Push → Kayıtlı cihaz yok**: gönderim denendi ama alıcının cihazı yok
  (yukarıdaki madde).
- **Push → Gönderildi** varsa Firebase kabul etmiş; bildirim gelmiyorsa sorun
  Firebase'den sonrasında: iOS'ta APNs anahtarı, Android'de telefonun bildirim
  ayarı.
- **Dış servis → Firebase / Google erişim anahtarı**: Firebase ya da Google
  reddetmiş; ayrıntıda servisin kendi cevabı durur (`403 PERMISSION_DENIED`,
  `400 invalid_grant`…).
- **Push → Firebase ayarlı değil**: Sistem sayfası da **Kapalı** der.

Laravel'in kendi satırları `storage/logs/laravel-<tarih>.log`'da
(`LOG_STACK=single` ise `laravel.log`) da durur: *Google did not hand out a
fcm access token.*, *Firebase refused a push.*, *A push could not be sent.*

| Belirti | Anlamı | Çözüm |
| --- | --- | --- |
| Bildirim adımı hiç görünmüyor; Ayarlar → Bildirimler "Bu sürümde bildirimler henüz açık değil." diyor | Derlemede Firebase dosyası yok (Xcode'da *…GoogleService-Info.plist is missing…* uyarısı) | 1.2–1.4, yeniden derle |
| Adım görünmüyor, ama Ayarlar → Bildirimler izin istiyor ya da telefonun ayarlarını açıyor | Beklenen: telefon daha önce sordu, ya da bildirimler zaten açık | — |
| Xcode: *Provisioning profile … doesn't include the aps-environment entitlement* | App ID'de Push Notifications yok, profil eski | 2.1 |
| `push_tokens` boş | İzin yok, oturum açık değil, istek API'ye ulaşmadı ya da iOS bir APNs belirteci alamadı (Firebase o zaman token vermez) | Ayarlar → Bildirimler; oturum aç; iOS'ta gerçek cihaz ve 2.1 |
| Panel: "Push bildirimleri kapalı" | `QUEZBY_PUSH_ENABLED` kapalı, `FIREBASE_PROJECT_ID` boş ya da JSON o yolda yok / okunamıyor | 3.3, `/ops/optimize` |
| Log: *Google did not hand out a fcm access token.* | Anahtar silinmiş ya da iptal edilmiş, sunucu saati kaymış ya da `oauth2.googleapis.com`'a çıkış yok | Yeni anahtar (3.2); `curl -I` (3.4) |
| Log: *Firebase refused a push.* `403`, `PERMISSION_DENIED` | Servis hesabında rol yok, FCM API (V1) kapalı, ya da `FIREBASE_PROJECT_ID` / anahtar token'ın projesinden değil (FCM'in `SENDER_ID_MISMATCH`'i) | 3.1, 3.2; proje `quezby-staging` |
| Log: *Firebase refused a push.* `401`, `UNAUTHENTICATED`, iOS token'larında tekrar ediyor | APNs anahtarı Firebase'de yok ya da yanlış (FCM'in `THIRD_PARTY_AUTH_ERROR`'u). Tek bir 401 süresi dolmuş erişim token'ı da olabilir: API onu bırakır, bir sonraki gönderim yenisini alır | 2.2–2.3 |
| iOS'ta Xcode'dan kurulan derleme alıyor, TestFlight almıyor (ya da tersi) | APNs anahtarı tek bir ortama kısıtlı | 2.2: *Sandbox & Production* |
| Simülatörde gelmiyor | Uçtan uca deneme simülatörde yapılmaz | 4.2; yönlendirme için 4.3 |
| Aynı arkadaştan ikinci hazır mesaj push'u gelmiyor | Beklenen: 5 dakikada en fazla bir (`inbox.push_gap_seconds`); mesaj kutusunda durur | — |
| Reddedilen ya da süresi dolan VS'in push'u yok | Beklenen: yalnızca mesaj kutusuna düşer | — |
| Oyun açıkken sistem bildirimi yok | Beklenen: üstte oyunun şeridi çıkar | — |
