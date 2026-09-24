# Puanlama ve zorluk — Engine v2 (kilitli)

**Kod:** `packages/engine/src/rules.ts` (TS) · `apps/api/app/Game/Rules.php` (PHP ikizi)
**Kilit:** `packages/engine/rules.lock.json` · **Denge raporu:** `pnpm engine:simulate`
**Parite testleri:** `packages/engine/fixtures/*.json` → `apps/api/tests/Unit/EngineParityTest.php`

Quezby sonsuz bir oyundur: reel akışı hiç bitmez, ama her reel bir öncekinden
biraz daha zordur ve **dopamin barı her reelde biraz daha hızlı erir**. Er ya da
geç herkes düşer; soru kimin ne kadar uzağa gittiğidir.

Puan sisteminin iki sözü var:

1. **Aynı yetenek, aynı süre → ±%20.** 5–6 dakikalık bir turda 1000 yapan
   oyuncu, başka bir 5–6 dakikalık turda 800 ile 1200 arası yapar. Kombolar her
   turu farklı kılar, ama şans bir turu ikiye katlayamaz.
2. **Kurallar kilitli.** Bir kuralı değiştirmek sessiz bir düzenleme değil,
   yeni bir sezondur (aşağıda: *Kilit ve sezonlar*).

Her şey **tam sayı** aritmetiğiyle hesaplanır (oranlar binde, süreler
milisaniye). Sunucu, uygulamanın gönderdiği hareket kaydını PHP'de yeniden
oynatıp **aynı skoru kuruşu kuruşuna** bulur — skor istemciden asla kabul
edilmez.

## Dört reel

| Reel | Görünüş | Doğru hareket | Hata |
| --- | --- | --- | --- |
| Sıradan (`skip`) | Arduvaz tonları | Yukarı kaydır | Süre dolarsa ya da başka hareket |
| Arkadaş (`like`) | Pembe, "Arkadaşın" rozeti | Çift dokun | Kaydırırsan "arkadaşını görmezden geldin" |
| Altın (`hold`) | Altın, dolum çubuğu | Basılı tut, yeşil bölgede bırak | Erken / geç bırakmak, kaydırmak |
| Dokunma (`freeze`) | Koyu kırmızı, alarm çerçevesi | **Hiç dokunma**, süre bitsin | Herhangi bir dokunuş: "Yakalandın!" |

İlk 8 reel sabittir ve her türü bir kez öğretir: `skip, skip, like, skip, hold,
skip, freeze, skip`. Sonrası seed'den gelir. Reel türü dağılımında şans payı
ölçüldü ve önemsiz çıktı; "torba" karıştırıcısına gerek yok.

## Zorluk eğrileri (reel `n`, 0'dan başlar)

Pencere, altın çubuğun dolum süresi ve yeşil bölge aynı hiperbolik eğriyi izler:

```
değer(n) = min + (max − min) · 70 / (70 + n)
```

| n | Pencere | Beğeni penceresi | Dokunma süresi | Altın dolum | Yeşil bölge | Özel reel payı | Dopamin erimesi | Seviye çarpanı |
| --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 0 | 2200 ms | 2450 ms | 1210 ms | 1600 ms | %20,0 | %25,0 | 5,5 %/sn | x1,00 |
| 100 | 1258 | 1508 | 691 | 1070 | %13,5 | %35,0 | 7,5 | x1,66 |
| 200 | 1014 | 1264 | 557 | 933 | %11,8 | %39,2 | 9,5 | x2,00 |
| 400 | 838 | 1088 | 500 | 834 | %10,6 | %43,1 | 13,5 | x2,33 |
| 600 | 767 | 1017 | 500 | 794 | %10,1 | %45,0 | 17,5 | x2,50 |

- Pencere 600 ms'nin altına **asla** inmez (insan tepki + hareket süresi).
- Dopamin erimesi `55 + ⌊n / 5⌋` binde/saniye — **sınırsız artar**, bu yüzden
  mükemmel oynayan bir bot bile sonunda düşer.
- Özel reel payı %25'ten %50'ye yaklaşır; art arda en fazla 3 özel reel gelir
  ve iki "dokunma" reeli asla yan yana gelmez.

## Dopamin barı (can)

Bar 1000'den (%100) başlar, reel ekrandayken saniyede `erime(n)` kadar düşer.

| Olay | Bar |
| --- | --- |
| Sıradan reeli kaydırmak | +80 |
| Arkadaşı beğenmek / dokunmadan beklemek | +90 |
| Altın reeli yeşilde bırakmak | +100 (mükemmelse +60 daha) |
| Süreyi kaçırmak / yanlış hareket | −200 |
| Altında erken ya da geç bırakmak | −120 |
| Dokunma reeline dokunmak | −250 |

Bar bir reelin ortasında biterse tur o anda biter (`drained`); bir ceza onu
sıfıra indirirse de biter (`penalty`).

## Puan

```
ℓ          = ⌊n / 20⌋                              (seviye − 1)
L          = 1000 + ⌊2000 · ℓ / (ℓ + 10)⌋          seviye çarpanı, binde
kombo c    : isabet → min(1500, c + 50)            her isabet +0,05
             hata   → 1000 + ⌊(c − 1000) / 2⌋       x1'in üstü yarıya iner
reel puanı = ⌊(taban + bonus) · L · c / 1.000.000⌋
```

| | Sıradan | Arkadaş | Altın | Dokunma |
| --- | --: | --: | --: | --: |
| Taban | 100 | 120 | 150 | 120 |
| Bonus | hız: 0 → taban | hız: 0 → taban | hassasiyet: 0 → 150 | — |

- **Seviye çarpanı** x1,00'dan başlar, 11. seviyede x2,00'dır ve x3'e asla
  varmaz. Uzun tur daha değerlidir, ama bir şanslı dakika gerisini ezemez.
- **Kombo** x1,00 → x1,50: her isabet +0,05 ekler, bir hata yalnızca x1'in
  üstünü yarıya indirir. HUD'da "x1,25" diye görünür.
- **Hız bonusu:** `taban × (pencere − t) / (pencere − 250)`; `t` parmağın indiği
  an. 250 ms'den hızlısı ekstra puan getirmez — insanüstü başparmak ödüllendirilmez.
- **Hassasiyet:** yeşil bölgenin merkezine uzaklık, yarı genişliğe oranla;
  merkezin %30 yakınındaki bırakış **"Mükemmel!"** sayılır.

### İsimli kombolar

Her biri reelin üstüne `⌊değer · L / 1000⌋` puan ekler (kombo çarpanı uygulanmaz):

| Kombo | Değer | Ne zaman |
| --- | --: | --- |
| **Kusursuz seviye!** | 1500 | Seviyenin 20. reeli isabet ve o seviyede hiç hata yok |
| **Şimşek!** | 500 | Art arda 5 kaydırma/beğeni isabeti; kaydırma ≤ 550 ms, beğeni ≤ 700 ms. Yavaş bir karar ya da hata zinciri sıfırlar; altın ve dokunma reelleri zinciri bozmaz |
| **Soğukkanlı!** | 300 | Beğeni ya da altın isabetinin hemen ardından gelen dokunma reelini geçmek |
| **Geri dönüş!** | 1000 | Bar bir reeli %30'un altında bitirdikten sonra bir isabetle %50'ye çıkmak (her düşüş için bir kez) |

## Denge — 2.000'er simüle tur (`pnpm engine:simulate`)

Dört yetenek profili (tepki süresi, hata oranı, "dokunma" refleksi, altın
bırakma isabeti) ile ölçüldü. Süre = aktif süre + reel başına 220 ms geçiş.

| Profil | Reel p50 | Süre p10 / p50 / p90 | Skor p10 / p50 / p90 | Aynı süre (±%10) p10/p50 · p90/p50 | İsimli kombo payı |
| --- | --: | --- | --- | --- | --: |
| Yeni başlayan | 127 | 1:05 / **2:03** / 2:58 | 17 B / **40 B** / 65 B | **0,87 · 1,14** | %7 |
| Ortalama | 245 | 2:20 / **3:29** / 4:35 | 61 B / **104 B** / 148 B | **0,88 · 1,11** | %11 |
| İyi | 405 | 3:57 / **5:13** / 6:17 | 169 B / **240 B** / 306 B | **0,89 · 1,11** | %23 |
| Profesyonel | 631 | 6:13 / **7:26** / 8:16 | 402 B / **499 B** / 577 B | **0,89 · 1,10** | %31 |

- **±%20 sözü dört profilde de tutuyor.** Engine v1'de aynı ölçüm
  0,74–0,77 / 1,26–1,41 idi: sıfırlanan x1→x5 kombo gürültü, sınırsız seviye
  çarpanı süreyi skora üslü yansıtıyordu.
- Yetenek skora belirgin yansır (her basamak 2,1–2,6 kat); aynı tohumla
  (Günün akışı) da kural tutar.
- Ortalama oyuncu ~3,5 dakika oynar: tek doğrusal erime hem yeni başlayanı
  uzatıp hem ortalamayı kısaltamaz. Gerçek veriyle ayar gerekirse bu yeni bir
  sürüm ve yeni sezon olur.
- Aynı eşikler `packages/engine/src/__tests__/balance.test.ts`'te kilitlidir
  (400 tur/profil): biri bozulursa test kırılır.

## Kilit ve sezonlar

`packages/engine/rules.lock.json` motor sürümünü, **her kuralın** (kanonik
JSON'un SHA-256'sı) ve iki motorun oynadığı **fixture'ların** hash'ini, birkaç
altın skoru ve geçmişi tutar.

- TS (`lock.test.ts`) ve PHP (`tests/Unit/RulesLockTest.php`) testleri kural ya
  da davranış değiştiği anda kırılır.
- `pnpm engine:lock` yalnızca `ENGINE_VERSION` arttıysa yeniden mühürler; aynı
  sürümde değişmiş kuralları **reddeder**.
- **Sezon = motor sürümü.** Her sıralama satırı bir sezona aittir
  (`leaderboard_entries.season`) ve her sorgu geçerli sezona bakar. Kurallar bir
  gün değişirse eski skorlar yenileriyle asla aynı tabloya çıkmaz; "Tüm
  zamanlar" sezonun tüm zamanlarıdır. Oyuncunun rekoru da sezonun rekorudur.

### Bir kuralı değiştirmek (yeni sezon)

1. `packages/engine/src/rules.ts` içinde değeri değiştir, `ENGINE_VERSION`'ı artır.
2. `pnpm engine:simulate` — ±%20 sözünü ve süreleri kontrol et, bu dosyayı güncelle
   (`balance.test.ts` eşikleri de bekler).
3. `pnpm engine:fixtures` — parite dosyalarını yeniden üret.
4. `pnpm engine:lock` — yeni sürümü mühürle.
5. Aynı değişikliği `apps/api/app/Game/Rules.php` (ve `Run.php`) içinde yap,
   `Rules::ENGINE_VERSION`'ı eşitle; `php artisan test` PHP paritesini ve kilidi doğrular.
6. Uygulamanın yeni sürümünü yayınla ve `QUEZBY_*_MIN_VERSION`'ı yükselt; eski
   motorla açılan tur `engine_outdated` alır.

## Hile koruması

Telefon motoru yalnızca ekranı canlandırmak için çalıştırır; tur bittikten sonra
görünen her sayı sunucudan gelir.

1. `POST /runs` motor ve içerik sürümünü ister; eski uygulama tur açamaz
   (`engine_outdated`). Seed sunucudan gelir; oyuncunun **tek açık turu**
   olabilir (yenisi eskisini `abandoned` yapar), süresi geçen tur `expired` olur.
2. Uygulama yalnızca hareketleri gönderir: her reel için `[hareket, t, d]`.
3. Sunucu PHP motoruyla tekrar oynatır; motorun reddettiği kayıt (`late_action`,
   `gesture_not_allowed`…) tur olarak sayılmaz (`rejected`).
4. **Sert bayraklar** (tur saklanır, hiçbir tabloya girmez):
   - `wall_clock`: geçen süre, uygulamanın gerçek temposundan kısa — 1,8 sn geri
     sayım + her reelin aktif süresi + karardan sonraki bekleme (0/160/260 ms) ve
     170 ms kayma, 1 sn tolerans. Tempo `@quezby/config` `PACE` ile paylaşılır.
   - `fast_decisions`: ≥30 kaydırma/beğeni isabetinin %20'den fazlası 250 ms altında.
   - `hold_bounds`: uygulamanın çoktan bitireceği uzunlukta bir basılı tutma.
   - `client_mismatch`: uygulamanın gösterdiği skor sunucununkiyle aynı değil.
   - `banned`: oyuncu (sessizce) yasaklı.
5. **Yumuşak sinyaller** (yalnızca zirve skorunu bekletir): karar sürelerinin
   değişim katsayısı < 0,08 (`reaction_cv`), kararların 250–280 ms'ye yığılması,
   altınların ≥%90'ı mükemmel, oyuncunun sezon rekorunun ≥3 katı, aynı telefondan
   ikinci hesabın aynı günlük akışı. Sinyalli bir skor sezonun ilk 10'una ya da
   haftanın ilk 3'üne girecekse `review` olur ve bir moderatör bakana kadar
   tabloya çıkmaz.
6. Eşikler 8.000 simüle tura karşı kalibre edildi; hiçbir dürüst profil
   yakalanmaz (`tests/Unit/RunVerifierTest.php`).
7. Moderasyon: `php artisan quezby:review`, `quezby:run:approve|reject`,
   `quezby:user:ban|unban`, `quezby:runs:expire`; SSH'sız hostlarda
   `POST /api/v1/ops/moderate` (`MODERATION_TOKEN`).

Bu, "skoru elle POST etmek" türü hileyi tamamen, bot yazmayı ise ciddi biçimde
zorlaştırır. Tam koruma istemci tarafında imkânsızdır; şüpheli turlar
`runs.flags` alanında (sert/yumuşak) saklanır.
