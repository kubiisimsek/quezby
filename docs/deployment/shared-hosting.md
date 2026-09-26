# API'yi ve yönetim panelini paylaşımlı hostinge kurmak (cPanel)

API tek bir zip olarak yüklenir; SSH gerekmez. Yönetim paneli ayrı, statik
bir zip'tir ve kendi alt alan adında durur (aşağıda **Yönetim paneli**). Adımlar staging için yazıldı —
production'da `staging` yerine `production`, alan adı olarak `api.quezby.com`
kullan.

**Gereksinimler**

- PHP **8.3 veya üstü** (cPanel → MultiPHP Manager). Açık olması gereken
  eklentiler: `ctype`, `curl`, `dom`, `fileinfo`, `mbstring`, `openssl`,
  `pdo_mysql`, `tokenizer`, `xml`.
- MySQL 5.7+ ya da MariaDB 10.3+.
- **Cron gerekmez**: zamanlanmış görev ve kuyruk yok (ligler ve süresi dolan
  turlar tembel kapanır); oturum ve önbellek
  dosyada tutulur.

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
- `MODERATION_TOKEN` yalnızca moderasyon yaparken dolu olsun (aşağıda 6b).
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

cPanel → **Domains** → `staging-api.quezby.com`:

- **Önerilen:** Document Root = `quezby-api-staging/public`.
- Host buna izin vermiyorsa Document Root = `quezby-api-staging` (klasörün
  kendisi). Kökteki `.htaccess` her isteği `public/`'e yönlendirir; `.env`,
  `vendor/`, `storage/` gibi yollar dışarıdan açılmaz (403).
- SSL için cPanel → **SSL/TLS Status** → AutoSSL.

Kontrol: `curl https://staging-api.quezby.com/api/v1/health` →
`{"status":"ok",…}`. `500` dönüyorsa önce `APP_KEY`'e bak (Sorun giderme).

## 6. Migration ve önbellek

**SSH varsa:**

```bash
cd ~/quezby-api-staging
php artisan migrate --force
php artisan optimize
```

**SSH yoksa** (`.env` içinde `OPS_TOKEN` dolu olmalı):

```bash
curl -X POST https://staging-api.quezby.com/api/v1/ops/migrate  -H "X-Ops-Token: <OPS_TOKEN>"
curl -X POST https://staging-api.quezby.com/api/v1/ops/optimize -H "X-Ops-Token: <OPS_TOKEN>"
```

İkisi de `{"status":"ok","output":"…"}` döner; bir sorun olursa sebebi
`error.message` içindedir. Bu uç noktalar saatte 10 istekle sınırlıdır.

## 6b. Moderasyon (SSH yoksa)

`.env` içinde `MODERATION_TOKEN` doluysa aynı işleri `artisan` olmadan yaparsın:

```bash
curl -X POST https://api.quezby.com/api/v1/ops/moderate -H "X-Moderation-Token: <MODERATION_TOKEN>" \
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

## 7. `OPS_TOKEN`'ı kapat

Sunucudaki `.env` dosyasında (File Manager → Edit) satırı `OPS_TOKEN=` yap.
Hemen geçerli olur — config önbellekte olsa bile uç noktalar artık `404`
döner. 6. adımdaki curl ile kontrol et. Yerel `.env.staging`'de de boşalt;
migration gerektiren bir sonraki sürümde yeniden doldurursun.

## Güncelleme

3 → 4 → 6 → 7. Yeni sürüm açıldıktan sonra `optimize`'ı mutlaka yeniden
çağır: eski önbellek yeni kodla çalışmaya devam eder. Zip `.env`'i de getirir:
sunucuda elle değiştirdiğin bir değeri önce yerel `.env.staging`'e yaz,
yoksa güncelleme onu geri alır.

## Yönetim paneli (admin.quezby.com)

Panel (`apps/admin`) statik dosyalardan oluşur: PHP ya da Node gerekmez,
kendi alt alan adında durur ve API'ye tarayıcıdan bağlanır. Staging için
`staging` / `staging-admin.quezby.com`, production için `production` /
`admin.quezby.com` kullan.

1. **Önce API.** Panelin tabloları (`admins`, `audit_entries`) API'nin
   migration'larıyla gelir: API'nin yeni sürümünü yükle ve 6. adımdaki
   `migrate` + `optimize`'ı çalıştır.
2. **İlk Sahip hesabı.** Panelde kayıt olunmaz; ilk hesap API'nin durduğu
   yerde açılır:

   ```bash
   # SSH varsa
   php artisan quezby:admin:create sen@ornek.com --name="Adın Soyadın"

   # SSH yoksa (.env'de OPS_TOKEN dolu olmalı)
   curl -X POST https://api.quezby.com/api/v1/ops/admins -H "X-Ops-Token: <OPS_TOKEN>" \
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
4. **Alan adı.** cPanel → **Domains** → `admin.quezby.com` oluştur. Document
   Root için boş bir klasör seç (ör. `admin.quezby.com`); statik dosyalar
   olduğu için `public_html` altında olabilir. SSL: **SSL/TLS Status** →
   AutoSSL.
5. **Yükle.** File Manager → o klasör → zip'i yükle → **Extract**. `.htaccess`
   gizli bir dosyadır (File Manager → Settings → *Show Hidden Files*); orada
   olduğundan emin ol. Güncellemede önce eski `assets/` klasörünü sil, sonra
   yeni zip'i açıp üzerine yaz.
6. **Gir.** `https://admin.quezby.com` → geçici şifreyle giriş → panel önce
   kendi şifreni seçtirir. Başka yöneticileri panelden eklersin: **Yöneticiler
   → Yönetici ekle** (Sahip, Moderatör ya da İzleyici; geçici şifreyi bir kez
   gösterir).

Kontrol: tarayıcıda panel açılıyorsa ve bir alt sayfayı yenileyince
(`/players`) yine açılıyorsa `.htaccess` çalışıyor demektir. Giriş "Sunucuya
ulaşılamadı" diyorsa API'nin adresi yanlış paketlenmiştir ya da API
kapalıdır: `curl https://api.quezby.com/api/v1/health`.

Panel oturumu 12 saat sürer (`QUEZBY_ADMIN_TOKEN_HOURS`). Yöneticilerin her
işlemi — yasak, ad sıfırlama, tur onay/ret, hesap silme, migration —
**Denetim kaydı**nda kimin yaptığıyla durur; komut satırından ve ops
uçlarından yapılanlar da.

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
