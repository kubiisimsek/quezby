# API'yi ve yönetim panelini paylaşımlı hostinge kurmak (cPanel)

API tek bir zip olarak yüklenir; SSH gerekmez. Yönetim paneli ayrı, statik
bir zip'tir (aşağıda **Yönetim paneli**). Adımlar staging için yazıldı:
staging'de API ve panel kendi alt alan adlarında durur. Production tek alan
adındadır, klasör düzeni hemen aşağıda.

## Production: tek alan adı (quezby.com)

| Adres | Ne | `public_html` içinde |
| --- | --- | --- |
| `https://quezby.com/api/…` | API (`apps/api`) | `api/`: `pnpm api:package:production` zip'i |
| `https://quezby.com/panel/` | Yönetim paneli (`apps/admin`) | `panel/`: `pnpm admin:package:production` zip'i |
| `https://quezby.com/privacy-policy` | Gizlilik politikası, 8 dil | kök: `.htaccess`, `robots.txt`, `legal/` (site zip'i) |
| `https://quezby.com/delete-account` | Hesap silme sayfası, 8 dil (Google Play'in "hesap silme URL'si") | aynı site zip'i |

- **API:** zip'i `public_html/api` klasörüne aç (4. adım, klasör adı `api`).
  Alan adı bağlamak gerekmez (5. adımı atla). Zip'in kökündeki `.htaccess`
  her isteği `public/`'e verir. `.env`, `vendor/`, `storage/`, `app/` gibi
  yollar dışarıdan 403 döner. Laravel `/api/public/index.php`'den çalışır ve
  rotalar `/api/v1/…` olarak kalır (`tests/Feature/SubfolderHostingTest.php`).
  **Yalnızca `public/`'i `public_html/api`'ye kopyalama:** o zaman Laravel
  `/api`'yi kendi yolu sayar ve her rota 404 olur. `.env`'de
  `APP_URL=https://quezby.com`.
- **Panel:** production paketi `/panel/` için derlenir. Zip'i
  `public_html/panel` klasörüne aç. Panel API'yle aynı kökte olduğu için
  CORS ön isteği de yoktur.
- **Gizlilik politikası:** `store-screenshots/quezby-site.zip`
  (git'e girmez; `python3 store-screenshots/kaynak/privacy.py` üretir).
  `public_html`'in köküne aç.
  - `/privacy-policy`, tarayıcının diline göre sayfayı açar:
    - `Accept-Language` başlığına bakılır;
    - eşleşme yoksa İngilizce açılır;
    - adres değişmez.
  - `/delete-account` de aynı şekilde çalışır.
  - `/privacy-policy/de` gibi bir adres tek bir dili açar. Bilinmeyen bir dil
    `/privacy-policy`'ye döner.
  - `legal/` doğrudan açılmaz (404).
- **Kökteki `.htaccess`:**
  - http'yi ve `www`'yu `https://quezby.com`'a yönlendirir.
  - `api/` ile `panel/`'e dokunmaz: Apache yalnızca en içteki klasörün
    `.htaccess` kurallarını çalıştırır.
  - Bu yüzden `/api` ve `/panel` için https'i cPanel → **Domains** →
    **Force HTTPS Redirect** ile aç.
- **Uygulama:** production derlemesi `https://quezby.com`'a bağlanır
  (`apps/mobile/.env` → `API_URL_PRODUCTION=https://quezby.com`, `/api`
  olmadan).

## Tek tuşla: GitHub Actions

Hostta SSH açıksa API'yi ve paneli zip'le uğraşmadan tek düğmeyle
gönderirsin. Yol şu: **Actions** → **Deploy** → **Run workflow**. Orada ortamı
(`staging` / `production`), neyin gideceğini (`all` / `api` / `admin`)
seçersin; istersen **Deneme**'yi de işaretlersin.

İş akışı (`.github/workflows/deploy.yml`) şunları yapar:

1. Testleri koşar: lint, typecheck, `pnpm test`, `pnpm test:api`. Biri
   kırmızıysa hiçbir şey gitmez.
2. `scripts/deploy.mjs` ile iki paketi derler: `package-api.sh` ve
   `package-admin.mjs`, elle paketlemedekiyle aynı.
3. API'yi rsync ile SSH'tan yükler. Sonra `migrate --force` ve `optimize`
   çalışır, ardından `/api/v1/health` yanıt veriyor mu diye bakılır.
4. Sonra paneli yükler.

Production yalnızca `main` dalından gider.

**Sunucuda neye dokunulmaz, ne silinir:**

- `storage/`'a (oyuncuların fotoğrafları, `storage/app/private/`'daki
  anahtarlar) ve hostun `error_log` dosyalarına dokunulmaz.
- Pakette olmayan her şey silinir.
- Klasör boş değilse ve içinde `artisan` (API) ya da `index.html` (panel)
  yoksa yükleme reddedilir.
- Ev klasörü, `public_html`'in kendisi ve `..` içeren yollar da reddedilir.

**Bir kez kurulum:**

1. **SSH anahtarı.** Kendi bilgisayarında bir anahtar çift üret:

   ```bash
   ssh-keygen -t ed25519 -N "" -C quezby-deploy -f ~/.ssh/quezby_deploy
   ```

   Açık anahtarı cPanel → **SSH Access** → **Manage SSH Keys** → **Import
   Key**'e yapıştır (`~/.ssh/quezby_deploy.pub`), sonra **Authorize**'a bas.
2. **Sunucunun parmak izi:**

   ```bash
   ssh-keyscan -p <port> <host>
   ```

   Çıktının tamamı `SSH_KNOWN_HOSTS` olur.
3. **PHP'nin yolu.** Hostta `php -v` 8.3 demiyorsa cPanel'in PHP'sinin tam
   yolunu bul, ör. `/opt/cpanel/ea-php83/root/usr/bin/php`.
4. **GitHub ortamları.** Repo → **Settings** → **Environments**'ta `staging`
   ve `production` adlı iki ortam aç. Production'a **Required reviewers**
   ekle; böylece her production gönderimi senin onayını bekler. Her ortama
   şunları gir:

   | Tür | Ad | Değer |
   | --- | --- | --- |
   | Secret | `API_ENV_FILE` | `apps/api/.env.<ortam>`'ın **tamamı** (aynı `APP_KEY`) |
   | Secret | `SSH_PRIVATE_KEY` | `~/.ssh/quezby_deploy` (gizli anahtar) |
   | Secret | `SSH_KNOWN_HOSTS` | 2. adımın çıktısı |
   | Variable | `DEPLOY_SSH_HOST` | ör. `quezby.com` |
   | Variable | `DEPLOY_SSH_USER` | cPanel kullanıcı adı |
   | Variable | `DEPLOY_SSH_PORT` | boşsa `22` |
   | Variable | `DEPLOY_API_DIR` | production: `public_html/api` · staging: `quezby-api-staging` |
   | Variable | `DEPLOY_ADMIN_DIR` | production: `public_html/panel` · staging: panelin Document Root'u |
   | Variable | `DEPLOY_PHP` | boşsa `php`, değilse 3. adımdaki yol |

**Dikkat edilecekler:**

- Klasör yolları SSH ev klasörüne göredir; `~` yazma.
- İlk seferde **Deneme** ile çalıştır. rsync neyi yükleyeceğini ve neyi
  sileceğini listeler; hiçbir şey göndermez, migration da yapmaz.
- `.env`'i değiştireceksen önce `API_ENV_FILE`'ı güncelle, sonra gönder.
  Her gönderim sunucudaki `.env`'i bu secret'la değiştirir; elle
  yaptığın bir düzeltme bir sonraki gönderimde geri gider.
- SSH ile `OPS_TOKEN` gerekmez, boş kalabilir.
- Aynı betik kendi bilgisayarından da çalışır. Aynı `DEPLOY_*` değişkenleri
  gerekir, bir de GNU rsync: macOS'un rsync'i `--chmod`'u tanımaz, önce
  `brew install rsync`. Komut:

  ```bash
  node scripts/deploy.mjs production api
  ```

Elle zip yolu (aşağıdaki adımlar) SSH olmayan hostlar için olduğu gibi
duruyor.

**Gereksinimler**

- PHP **8.3 veya üstü** (cPanel → MultiPHP Manager). Açık olması gereken
  eklentiler: `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `mbstring`, `openssl`,
  `pdo_mysql`, `tokenizer`, `xml`. `gd` profil fotoğrafları içindir: API
  gelen her fotoğrafı onunla yeniden kaydeder; yoksa fotoğraf yüklemek hata
  verir ve panelin **Sistem** sayfası "GD eksik" der.
- MySQL 5.7+ ya da MariaDB 10.3+.
- **Cron gerekmez**: zamanlanmış görev ve kuyruk yok (ligler, VS'ler ve
  süresi dolan turlar tembel kapanır; eski mesajlar ve analitik bir isteğin
  yanıtından sonra budanır; push bildirimleri de yanıttan sonra gider);
  oturum ve önbellek dosyada tutulur.

## 1. Veritabanını oluştur

cPanel → **MySQL® Databases**:

1. Yeni veritabanı, ör. `quezby_staging` (cPanel başına hesap adını ekler:
   `hesap_quezby_staging`).
2. Yeni kullanıcı ve güçlü bir şifre.
3. **Add User To Database** → kullanıcıya bu veritabanında **ALL PRIVILEGES**.

## 2. `.env` dosyasını hazırla (kendi bilgisayarında)

```bash
cp apps/api/.env.staging.example apps/api/.env.staging
(cd apps/api && php artisan key:generate --show)   # çıktıyı APP_KEY= satırına yapıştır
openssl rand -hex 32                                # çıktıyı OPS_TOKEN= satırına yapıştır (SSH yoksa)
```

- `APP_KEY`: `key:generate --show` çıktısı, **bir kez**. Kontrol noktası
  makbuzları bununla imzalanır, Apple'ın refresh token'ları bununla şifrelenir.
  Anahtarsız API her oyuncu isteğine `500` döner (panel açık kalır, **Sistem**
  sayfası kırmızıyla söyler). Yerel `.env.staging` ile sunucudaki `.env` hep
  **aynı** anahtarı taşır — her güncelleme zip'i sunucudaki `.env`'in üzerine
  yazar — ve anahtar bir daha **değişmez**: değişirse o an oynanan turların
  makbuzları "Sahte makbuz" olur, kayıtlı Apple token'ları okunamaz.
  (`APP_PREVIOUS_KEYS` makbuzları kurtarmaz.)
- `APP_ENV` dosyanın ortamıdır: `staging` ya da `production`. `local` yazmak o
  ortamın korumalarını (ör. `APP_DEBUG` reddi) atlatır.
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: 1. adımdaki bilgiler.
  `DB_HOST` çoğu hostta `localhost`'tur.
- `APP_DEBUG=false` kalmalı. Staging ve production'da `true` ile API hiç
  açılmaz: her istek 500 döner, sebebi log'a yazılır.
- `QUEZBY_DAILY_SECRET`: `openssl rand -hex 32` — Günün akışı tohumunun anahtarı.
  Bir kez koy, sezon ortasında değiştirme (o günün akışı oyuncuların altından değişir).
- Apple/Google girişi için `GOOGLE_CLIENT_IDS` ve (hesap silmede Apple iznini
  geri almak için) `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` —
  ayrıntı: `docs/development/environments.md`. `APPLE_BUNDLE_IDS` boş kalır:
  her ortamda tek uygulama, `com.kubisimsek.game.quezby`.
  `.p8` dosyasını zip'e koyma; File Manager ile `storage/app/private/`'a yükle.
  Hostun `appleid.apple.com` ve `googleapis.com`'a HTTPS çıkışına izin verdiğini
  cPanel Terminal'den `curl -I https://appleid.apple.com/auth/keys` ile doğrula.
- Cihaz doğrulaması (ayrıntı: `docs/development/environments.md` → "Device
  integrity"): production'da `QUEZBY_INTEGRITY_MODE=enforce`, staging'de `log`.
  Google Play Integrity servis hesabının JSON anahtarını zip'e koyma; File
  Manager ile `storage/app/private/`'a yükle ve yolunu
  `GOOGLE_PLAY_INTEGRITY_CREDENTIALS`'a yaz. `PLAY_INTEGRITY_PACKAGES` boş kalır
  (tek paket: `com.kubisimsek.game.quezby`), `APP_ATTEST_ENVIRONMENTS` production'da
  `production`. Adım adım konsol kurulumu:
  `docs/development/device-integrity-setup.md`. Hostun
  `playintegrity.googleapis.com` ve `oauth2.googleapis.com`'a HTTPS çıkışı açık
  olmalı: `curl -I https://playintegrity.googleapis.com`.
- Push bildirimleri (adım adım: `docs/development/push-setup.md`): Firebase
  servis hesabının JSON anahtarını zip'e koyma; File Manager ile
  `storage/app/private/`'a yükle (ör. `storage/app/private/firebase-push.json`).
  Sonra:

  ```dotenv
  QUEZBY_PUSH_ENABLED=true
  FIREBASE_PROJECT_ID=quezby-staging
  FIREBASE_CREDENTIALS=storage/app/private/firebase-push.json
  ```

  Production da **aynı** projeyi kullanır (`quezby-staging`) ve anahtarı o
  projeden olur: uygulamada tek bir Firebase dosyası var, telefonların push
  token'ları o projeye ait. `.env` değişince `optimize`'ı çağır (6. adım).
  Hostun `fcm.googleapis.com` ve `oauth2.googleapis.com`'a HTTPS çıkışı açık
  olmalı: `curl -I https://fcm.googleapis.com`. Üçü de dolu ve anahtar
  okunabiliyorsa panelin **Sistem** sayfası "Push bildirimleri (Firebase)"
  satırında **Açık** der; değilse hiçbir şey gönderilmez, başka hiçbir şey de
  bozulmaz.

- **E-posta (SMTP)** — e-postayla kayıt, profilden e-posta bağlama ve
  "Şifremi unuttum" 6 haneli bir kodla doğrulanır; kod oyuncunun kayıt olduğu
  dilde gider. SMTP yoksa kimse e-postayla kayıt olamaz. cPanel → **Email
  Accounts** → bir posta kutusu aç (ör. `no-reply@quezby.com`) → **Connect
  Devices** sunucuyu, portu ve kullanıcıyı gösterir:

  ```dotenv
  MAIL_MAILER=smtp
  MAIL_HOST=mail.quezby.com
  MAIL_PORT=465
  MAIL_SCHEME=smtps
  MAIL_USERNAME=no-reply@quezby.com
  MAIL_PASSWORD=posta-kutusunun-sifresi
  MAIL_FROM_ADDRESS=no-reply@quezby.com
  MAIL_FROM_NAME=Quezby
  ```

  587 portunda `MAIL_SCHEME` boş kalır (STARTTLS). Paketleme, `MAIL_MAILER`
  `smtp` değilse ya da `MAIL_HOST`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`
  boşsa uyarır. Kodların gereksiz klasörüne düşmemesi için alan adında
  SPF/DKIM açık olsun (cPanel → **Email Deliverability**). `.env` değişince
  `optimize`'ı çağır (6. adım).
- `QUEZBY_LEAGUE_UNLOCK_RUNS=20`: Dereceli'nin (ve Elo ile ligin) kaç sayılan
  Normal ya da Günlük turdan sonra açıldığı. Her ortamda aynı kalır.
- `MODERATION_TOKEN` yalnızca moderasyon yaparken dolu olsun (aşağıda 6b).
- Analitik (`docs/product/analytics.md`): `QUEZBY_ANALYTICS_ENABLED=true`,
  `QUEZBY_ANALYTICS_SAMPLE=1000`, `QUEZBY_ANALYTICS_VISIT_DAYS=30`,
  `QUEZBY_ANALYTICS_DAY_DAYS=90`, `QUEZBY_DEVICE_DAYS=180` varsayılanları
  olduğu gibi kalabilir. Sunucu zorlanırsa önce `QUEZBY_ANALYTICS_SAMPLE`'ı
  düşür (ör. `250`), gerekirse `QUEZBY_ANALYTICS_ENABLED=false` yap; ikisi de
  `optimize` sonrası hemen geçerli olur ve uygulamalar bir gün boyunca
  göndermeyi keser. Panelin **Analitik → Veri hacmi** kutusu her katmanın ne
  kadar tuttuğunu gösterir.
- Yayında `QUEZBY_IOS_MIN_VERSION` / `QUEZBY_ANDROID_MIN_VERSION`'ı v2
  uygulamanın sürümüne yükselt: eski uygulamalar sıralamaya zaten giremez
  (`engine_outdated`), güncelleme ekranı onlara nedenini söyler.
- `.env.staging` ve `.env.production` git'e girmez; paylaşma.

## 3. Paketle

Depo kökünde:

```bash
./scripts/package-api.sh staging      # ya da: pnpm api:package:staging
```

Çıktı: `dist-deploy/quezby-api-staging-<tarih>.zip`. İçinde production
bağımlılıkları kurulu `vendor/` ve `.env` olarak `apps/api/.env.staging` var;
testler, loglar, sqlite dosyaları ve diğer `.env*` dosyaları yok.

Script işe `.env.staging`'i denetleyerek başlar (`scripts/check-api-env.mjs`,
elle de çalışır: `node scripts/check-api-env.mjs staging`): `APP_KEY` boş ya da
bozuksa, `APP_ENV` `staging` değilse ya da `APP_DEBUG` açıksa hiçbir şey
üretmeden durur ve neyin eksik olduğunu söyler (değerleri asla yazmaz).
`.env.staging` bulunamazsa script uyarır ve zip'i `.env` olmadan üretir; o
zaman sunucudaki `.env`'de `APP_KEY`, `APP_ENV` ve `APP_DEBUG=false` olmalı.

## 4. Yükle ve aç

cPanel → **File Manager**:

1. Ev dizininde, `public_html`'in **dışında** bir klasör aç:
   `quezby-api-staging`.
2. Zip'i bu klasöre yükle → sağ tık → **Extract**. Güncellemede aynı klasöre
   açıp üzerine yaz.

## 5. Alan adını bağla

cPanel → **Domains** → `quezby.kubisimsek.com`:

- **Önerilen:** Document Root = `quezby-api-staging/public`.
- Host buna izin vermiyorsa Document Root = `quezby-api-staging` (klasörün
  kendisi). Kökteki `.htaccess` her isteği `public/`'e yönlendirir; `.env`,
  `vendor/`, `storage/` gibi yollar dışarıdan açılmaz (403).
- SSL için cPanel → **SSL/TLS Status** → AutoSSL.

Kontrol: `curl https://quezby.kubisimsek.com/api/v1/health` (production'da
`https://quezby.com/api/v1/health`) → `{"status":"ok",…}`. `500` dönüyorsa önce `APP_KEY`'e bak (Sorun giderme).

## 6. Migration ve önbellek

**SSH varsa:**

```bash
cd ~/quezby-api-staging
php artisan migrate --force
php artisan optimize
```

**SSH yoksa** (`.env` içinde `OPS_TOKEN` dolu olmalı):

```bash
curl -X POST https://quezby.kubisimsek.com/api/v1/ops/migrate  -H "X-Ops-Token: <OPS_TOKEN>"
curl -X POST https://quezby.kubisimsek.com/api/v1/ops/optimize -H "X-Ops-Token: <OPS_TOKEN>"
```

İkisi de `{"status":"ok","output":"…"}` döner; bir sorun olursa sebebi
`error.message` içindedir. Bu uç noktalar saatte 10 istekle sınırlıdır.

## 6b. Moderasyon (SSH yoksa)

`.env` içinde `MODERATION_TOKEN` doluysa aynı işleri `artisan` olmadan yaparsın:

```bash
curl -X POST https://quezby.com/api/v1/ops/moderate -H "X-Moderation-Token: <MODERATION_TOKEN>" \
  -H "Content-Type: application/json" -d '{"action":"held"}'                              # incelemedeki turlar
curl … -d '{"action":"approve","runId":"01J…"}'                                            # sıralamaya al
curl … -d '{"action":"reject","runId":"01J…","reason":"bot"}'                               # reddet
curl … -d '{"action":"ban","username":"hileci","reason":"bot"}'                             # sessiz yasak
```

**Yönetim paneli kuruluysa** (aşağıda) bu işlerin hepsini oradan, kimin
yaptığı kayda geçerek yaparsın; `MODERATION_TOKEN`'ı boş bırak.

SSH varsa: `php artisan quezby:review`, `quezby:run:approve {run}`,
`quezby:run:reject {run} --reason=…`, `quezby:user:ban {username} --reason=…`,
`quezby:user:unban {username}`. İşin bitince `MODERATION_TOKEN=` satırını boşalt.

İsteğe bağlı cron (günde bir): `php artisan quezby:runs:expire` — yarım kalan
eski turları kapatır. Gerekli değil: her oyuncunun eski turu bir sonraki
turunda zaten kapanır; ligler de cron'suz, tembel kapanır.

Aynı şekilde isteğe bağlı: `php artisan quezby:analytics:prune` — süresi dolan
analitik satırlarını ve uzun süredir görülmeyen telefonları siler. API bunu
kendisi de yapar (saatte en çok bir kez, bir isteğin yanıtından sonra, küçük
parçalarla); panelde **Sistem → Analitiği temizle** aynısını hemen yapar.
Cron `schedule:run` çağırıyorsa ikisi de kendiliğinden çalışır.

## 7. `OPS_TOKEN`'ı kapat

Sunucudaki `.env` dosyasında (File Manager → Edit) satırı `OPS_TOKEN=` yap.
Hemen geçerli olur — config önbellekte olsa bile uç noktalar artık `404`
döner. 6. adımdaki curl ile kontrol et. Yerel `.env.staging`'de de boşalt;
migration gerektiren bir sonraki sürümde yeniden doldurursun.

## Güncelleme

3 → 4 → 6 → 7. Yeni sürüm açıldıktan sonra `optimize`'ı mutlaka yeniden
çağır: eski önbellek yeni kodla çalışmaya devam eder. Zip `.env`'i de getirir:
sunucuda elle değiştirdiğin bir değeri önce yerel `.env.staging`'e yaz,
yoksa güncelleme onu geri alır. `storage/` ise zip'te boş klasörlerden
ibarettir: oyuncuların profil fotoğrafları (`storage/app/avatars`) ve
`storage/app/private/`'a yüklediğin anahtarlar güncellemeden etkilenmez.

## Yönetim paneli (quezby.com/panel)

Panel (`apps/admin`) statik dosyalardan oluşur: PHP ya da Node gerekmez ve
API'ye tarayıcıdan bağlanır. Production'da `quezby.com/panel/` adresinde,
`public_html/panel` klasöründe durur. Staging'de kendi alt alan adındadır:
`staging` / `quezby-admin.kubisimsek.com`.

1. **Önce API.** Panelin tabloları (`admins`, `audit_entries`) API'nin
   migration'larıyla gelir: API'nin yeni sürümünü yükle ve 6. adımdaki
   `migrate` + `optimize`'ı çalıştır.
2. **İlk Sahip hesabı.** Panelde kayıt olunmaz; ilk hesap API'nin durduğu
   yerde açılır:

   ```bash
   # SSH varsa
   php artisan quezby:admin:create sen@ornek.com --name="Adın Soyadın"

   # SSH yoksa (.env'de OPS_TOKEN dolu olmalı)
   curl -X POST https://quezby.com/api/v1/ops/admins -H "X-Ops-Token: <OPS_TOKEN>" \
     -H "Content-Type: application/json" -d '{"email":"sen@ornek.com","name":"Adın Soyadın"}'
   ```

   İkisi de **geçici şifreyi bir kez** gösterir; not al. Aynı e-postayla
   tekrar çağırırsan (komutta `--reset`) yeni bir geçici şifre verir — şifreni
   unutursan böyle dönersin. İşin bitince `OPS_TOKEN=` satırını boşalt (7. adım).

3. **Paketle** (kendi bilgisayarında, depo kökünde):

   ```bash
   pnpm admin:package:production    # ya da: pnpm admin:package:staging
   ```

   Çıktı: `dist-deploy/quezby-admin-production-<tarih>.zip` — `index.html`,
   `assets/`, `.htaccess` (yönlendirme, önbellek, güvenlik başlıkları; hangi
   API'ye bağlanacağını da yazar), `robots.txt`, `favicon.svg`.
   `VITE_API_ORIGIN` dışında bir `VITE_*` değişkeni doluysa betik paketlemez:
   o değerler herkese açık pakete girerdi.

4. **Klasör.** Production: `public_html/panel` (alan adı gerekmez). Staging:
   cPanel → **Domains** → `quezby-admin.kubisimsek.com` oluştur, Document Root
   için boş bir klasör seç; SSL: **SSL/TLS Status** → AutoSSL.
5. **Yükle.** File Manager → o klasör → zip'i yükle → **Extract**. `.htaccess`
   gizli bir dosyadır (File Manager → Settings → _Show Hidden Files_); orada
   olduğundan emin ol. Güncellemede önce eski `assets/` klasörünü sil, sonra
   yeni zip'i açıp üzerine yaz.
6. **Gir.** `https://quezby.com/panel/` → geçici şifreyle giriş → panel önce
   kendi şifreni seçtirir. Başka yöneticileri panelden eklersin: **Yöneticiler
   → Yönetici ekle** (Sahip, Moderatör ya da İzleyici; geçici şifreyi bir kez
   gösterir).

Kontrol: tarayıcıda panel açılıyorsa ve bir alt sayfayı yenileyince
(`/panel/players`) yine açılıyorsa `.htaccess` çalışıyor demektir. Giriş "Sunucuya
ulaşılamadı" diyorsa API'nin adresi yanlış paketlenmiştir ya da API
kapalıdır: `curl https://quezby.com/api/v1/health`.

Panel oturumu 12 saat sürer (`QUEZBY_ADMIN_TOKEN_HOURS`). Yöneticilerin her
işlemi — yasak, ad sıfırlama, fotoğraf kaldırma, bildirimleri kapatma, tur
onay/ret, hesap silme, migration — **Denetim kaydı**nda kimin yaptığıyla
durur; komut satırından ve ops uçlarından yapılanlar da. Oyuncuların
birbirinin fotoğrafı ya da adı hakkındaki bildirimleri panelin
**Bildirimler** sayfasına düşer (`docs/backend/admin-api.md` → _Reports_).

## Sorun giderme

- **500 / `server_error`**: `storage/logs/laravel-<tarih>.log`
  (`LOG_STACK=single` ise `laravel.log`).
- **Oyuncu istekleri 500, panel açık** (Sistem'de "APP_KEY eksik"; log'da
  `APP_KEY is missing`): sunucudaki `.env`'de `APP_KEY` boş ya da önbellekte
  eskisi var. Yerel `.env.staging`'deki satırı aynen yaz, panelde **Sistem →
  Önbelleği yenile**. Bu hâldeyken biten sıralı turlar "Makbuz eksik"le
  incelemeye düşer ve Apple ile giriş olmaz; düzeltmeden sonra kuyruktakileri
  onayla.
- **`.env` değişikliği etkisiz**: config önbellekte. `optimize`'ı yeniden
  çağır ya da `bootstrap/cache/config.php` dosyasını sil. (`OPS_TOKEN` bundan
  muaf, her istekte `.env`'den okunur.)
- **Her istek 401**: `Authorization` başlığı PHP'ye ulaşmıyor.
  `public/.htaccess` ve kökteki `.htaccess` bu başlığı iletir; silme.
- **Panelde bir alt sayfa 404 veriyor**: panelin `.htaccess`'i yüklenmemiş ya
  da hostta `mod_rewrite` kapalı. Zip'i gizli dosyalarla birlikte yeniden aç.
- **Panel "Bu işlem için yetkin yok" diyor**: rolün yetmiyor; bir Sahip
  **Yöneticiler**'den rolünü değiştirebilir.
- **Profil fotoğrafı yüklenmiyor** (Sistem'de "GD eksik"): PHP'nin `gd`
  eklentisi kapalı. cPanel'in PHP eklentileri arasından aç.
- **Push gelmiyor**: önce Sistem'deki "Push bildirimleri (Firebase)" satırı.
  **Kapalı** ise üç `.env` değerinden biri eksik ya da JSON anahtarı o yolda
  yok veya okunamıyor — API o zaman sessizce hiçbir şey göndermez; düzelt,
  `optimize`. **Açık** ise log'da _Google did not hand out a fcm access
  token._ (anahtar geçersiz ya da `oauth2.googleapis.com`'a çıkış yok) ya da
  _Firebase refused a push._ ara. Ayrıntı:
  `docs/development/push-setup.md` → Sorun giderme.
