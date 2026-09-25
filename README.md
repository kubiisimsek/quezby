# Quezby

Kaydırma alışkanlığını rekabetçi bir refleks oyununa çeviren mobil oyun.
Sonsuz bir akış: sıradan postu **kaydır**, arkadaşının postunu **çift dokunarak
beğen**, altın postu **basılı tut** ve yeşilde bırak, "annen geldi" postunda
**dokunma**. Dopamin barın bitmeden en yüksek skoru yap — her post biraz daha hızlı.

Her gün herkes aynı **Günün akışı**nı bir kez oynar; **haftalık ligler**de
benzer oyuncularla yarışır, takip ettiklerini **Zirve** tablosunda geçmeye
çalışırsın. Apple, Google ya da misafir olarak girilir.

```
apps/mobile      Bare React Native 0.86 (Qesvis ile aynı yığın, Expo yok)
apps/api         Laravel + Sanctum — hesap, kullanıcı adı, tur doğrulama, sıralama
packages/engine  Oyun kuralları — deterministik, tam sayı; API aynısını PHP'de oynatır
packages/config  Kullanıcı adı kuralları, akışın içerik kataloğu, uygulamanın temposu
packages/types   API sözleşmesi
packages/sdk     Tipli API istemcisi
docs/            Ürün, puanlama, tasarım dili, ortamlar, deploy
```

## Hızlı başlangıç

```bash
nvm use                      # Node 22
pnpm install
pnpm dev:api                 # Laravel, :8000
pnpm dev:mobile              # Metro, :8081
pnpm switch-local            # ortam: local (ilk seferde apps/mobile/.env'i de oluşturur)
pnpm ios                     # "Quezby Local" simülatörde
```

İlk kurulum adımları (Composer, `.env` dosyaları, CocoaPods):
[docs/development/local-development.md](docs/development/local-development.md).

## Tek uygulama, üç ortam

iOS ve Android'de tek kimlik: **`com.kubisimsek.game.quezby`**. Uygulamanın hangi
API'ye bağlanacağını `apps/mobile/.env` içindeki `QUEZBY_ENV` belirler:

| Ortam | Geçiş | Telefondaki ad | API |
| --- | --- | --- | --- |
| Local | `pnpm switch-local` | Quezby Local | `http://localhost:8000` |
| Staging | `pnpm switch-staging` | Quezby Staging | `https://staging-api.quezby.com` |
| Production | `pnpm switch-production` | Quezby | `https://api.quezby.com` |

Geçişten sonra `pnpm ios` / `pnpm android` (Metro açıksa yeniden başlat).
Mağaza derlemesi: geçiş → Xcode'da `Quezby` → Archive · `./gradlew bundleRelease`
([docs/development/environments.md](docs/development/environments.md)).
API'yi paylaşımlı hostinge atmak için: `pnpm api:package:staging` →
[docs/deployment/shared-hosting.md](docs/deployment/shared-hosting.md).

## Puanlama

`(taban + hız/hassasiyet bonusu) × seviye çarpanı × kombo` + isimli kombolar
(Kusursuz seviye, Şimşek, Soğukkanlı, Geri dönüş). Seviye çarpanı x1'den x3'e
yaklaşır, kombo x1,00–x1,50 arasındadır: **aynı yetenek aynı sürede ±%20 aynı
skoru yapar**. Kurallar `rules.lock.json` ile kilitli; değişiklik yeni sezon
demektir. Skor istemciden kabul edilmez: sunucu tur kaydını kendi motoruyla
yeniden oynatır, sonuç ekranındaki her sayı sunucudan gelir. Formüller, eğriler
ve 8.000 simüle oyunluk denge tablosu: [docs/product/scoring.md](docs/product/scoring.md).

## Kontroller

```bash
pnpm lint && pnpm typecheck && pnpm test   # paketler + mobil
pnpm test:api                              # Laravel (Pest) + motor, kilit, içerik paritesi
pnpm engine:simulate                       # denge raporu (±%20 sözü)
pnpm engine:lock                           # kural kilidi ("current" demeli)
```
