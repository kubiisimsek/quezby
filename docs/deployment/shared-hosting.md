# API'yi paylaşımlı hostinge kurmak (cPanel)

API tek bir zip olarak yüklenir; SSH gerekmez. Adımlar staging için yazıldı —
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
`.env.staging` bulunamazsa script uyarır ve zip'i `.env` olmadan üretir.

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
`{"status":"ok",…}`

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
çağır: eski önbellek yeni kodla çalışmaya devam eder.

## Sorun giderme

- **500 / `server_error`**: `storage/logs/laravel-<tarih>.log`.
- **`.env` değişikliği etkisiz**: config önbellekte. `optimize`'ı yeniden
  çağır ya da `bootstrap/cache/config.php` dosyasını sil. (`OPS_TOKEN` bundan
  muaf, her istekte `.env`'den okunur.)
- **Her istek 401**: `Authorization` başlığı PHP'ye ulaşmıyor.
  `public/.htaccess` ve kökteki `.htaccess` bu başlığı iletir; silme.
