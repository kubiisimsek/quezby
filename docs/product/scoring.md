# Puanlama ve zorluk — Engine v3 (kilitli)

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

### Süre: ne zaman başlar, ne zaman biter

- Bir reelin saati, reel **ekrana ilk çizildiği karede** başlar. O ana kadar
  reel görünmez ve dokunuşlar ona sayılmaz (kayma sırasındaki gibi): telefonun
  çizim süresi oyuncunun tepkisine yazılmaz.
- `t`, hareketin **tanındığı** andır:
  - kaydırmada, parmak henüz ekrandayken 60 px yukarı (ya da ≥ 0,35 px/ms
    hızla 20 px) gittiği an; yalnızca bırakış onu kaydırma yapıyorsa bırakış
    anı;
  - beğenide ikinci dokunuş;
  - altında basılış (`d` basılı kalınan süre);
  - dokunma reelinde ilk temas.

  Reel o anda gider, yani ekranda kaldığı süre motorun saydığı süreyle aynıdır.
- **Süre çubuğunun bittiği an kesindir.** O anda ekranda duran bir parmak
  hemen yargılanır: kıpırdamadan basılıysa basılı tutma (yanlış hareket), başka
  her durumda zaman aşımı. Parmağın kalkması beklenmez.
- Tek istisna, zamanında başlamış bir **altın tutuş**: bırakılana ya da artık
  yalnızca geç kalabileceği ana kadar sürer.
  - Tutuş sürerken süre çubuğu gizlenir; saat artık altın dolum çubuğudur.
  - Parmak kayıp tutuş süre bitmeden bozulursa çubuk, kalan süreyi göstererek
    geri gelir.
  - Tutuş süre bittikten sonra bozulursa reel hemen yargılanır.

### Deneme turu (ilk açılış)

Yeni oyuncunun ilk turu aynı motorla, aynı kurallarla oynanır ama **yalnızca
telefonda** kalır: sunucuya gitmez, tabloya, lige, istatistiğe ya da rekora
yazılmaz — çevrimdışı antrenman gibi. Her türün ilk reelinden (0, 2, 4 ve 6.)
önce akış bir koç kartıyla durur; reel ancak kart kapandıktan sonraki ilk
karede aktif olur. Motor
`t`'yi reelin aktif olduğu andan saydığı ve bar yalnızca aktif sürede eridiği
için bu duraklama sonucu hiç değiştirmez — kurallar kilitli kalır. Sıralı bir
turda aynı duraklama checkpoint'lerde `slow_motion` olurdu; bu yüzden koç
kartı yalnızca yerel deneme turunda vardır.

### VS (iki arkadaş)

VS turu da aynı motorla, aynı kurallarla oynanır: iki arkadaş aynı seed'i
(dolayısıyla aynı reel dizisini) birer kez oynar, önce gönderen. Tur sunucuda
tekrar oynatılır, checkpoint'leri alınır ve sert bayraklarla sıralı bir tur
gibi denetlenir (*Hile koruması*). Temiz VS turu `played` olur; sert bayraklı
tur `flagged` olur ve VS'i kaybeder — gönderenin turuysa VS hiç gönderilmez.
Yüksek temiz skor kazanır, eşitlik beraberliktir. VS hiçbir tabloya, lige,
istatistiğe ya da rekora yazılmaz ve ligin açılması için sayılmaz; kurallar ve
akış: [overview.md](./overview.md) → *Arkadaşlar*.

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

### Kör hamle (motor v3)

Reel canlandıktan sonraki **ilk 300 ms içinde** (`blindMs`) yanlış posta
kaydırmak ya da çift dokunmak **kör hamledir**: o sürede postun ne olduğuna
bakılamaz. Kör hamlenin cezası **ikiye katlanır**, arkasından gelen her kör
hamlede yeniden katlanır: −400, −800, −1600. Üçüncüsü turu her zaman bitirir.

- Sayaç **düşünülmüş bir isabetle** sıfırlanır: 300 ms ya da daha geç bir
  kaydırma/beğeni isabeti, bir altın isabeti ya da dokunulmadan geçilen bir
  dokunma reeli. Hızlı (300 ms altı) kaydırma isabetleri sayacı sıfırlamaz.
- Kör sayılmayanlar: süreyi kaçırmak, altında erken/geç bırakmak, bir postu
  basılı tutmak ve dokunma reeline dokunmak (onun zaten kendi, en ağır cezası
  var). Dokunma reelinde parmak ilk temasta yakalanır; o da kör sayılsaydı
  hızlı ama dürüst oyuncular gereğinden sert cezalanırdı.
- Amaç, bakmadan (iki parmakla, art arda) kaydırarak puan toplamayı bitirmek:
  motor v2'de her şeyi kaydıran bir oyuncu medyanda 7–8 B, en iyi %10'da
  20–38 B yapıyordu; v3'te her tohumda 5. reelde, 650 puanla düşer.
- Oyunda kör hamle "Bakmadan!" ve altında "Ceza x2" (x4, x8) olarak görünür
  (`Step.blind`).

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
- **Hız bonusu:** `taban × (pencere − t) / (pencere − 250)`; `t` hareketin
  tanındığı an (bkz. *Süre*). 250 ms'den hızlısı ekstra puan getirmez —
  insanüstü başparmak ödüllendirilmez.
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
Bir profilin tepki süresi, reelin çizildiği kareden hareketin tanındığı ana
kadar geçen süredir.

| Profil | Reel p50 | Süre p10 / p50 / p90 | Skor p10 / p50 / p90 | Aynı süre (±%10) p10/p50 · p90/p50 | İsimli kombo payı |
| --- | --: | --- | --- | --- | --: |
| Yeni başlayan | 126 | 1:05 / **2:02** / 2:57 | 17 B / **40 B** / 65 B | **0,88 · 1,15** | %7 |
| Ortalama | 243 | 2:17 / **3:27** / 4:33 | 60 B / **103 B** / 147 B | **0,88 · 1,12** | %11 |
| İyi | 401 | 3:51 / **5:10** / 6:15 | 164 B / **238 B** / 304 B | **0,89 · 1,11** | %23 |
| Profesyonel | 626 | 6:00 / **7:21** / 8:15 | 384 B / **494 B** / 573 B | **0,89 · 1,09** | %31 |
| Kör kaydıran (150–250 ms, her reel) | 5 | — | **650** (her tohumda) | — | — |

Kör hamle cezası dürüst profilleri medyanda ~%1 kısaltır (v2'de 40 / 104 /
240 / 499 B); en çok, dokunma reeline refleksle hızlı dokunan
profesyonellerin kötü turlarında hissedilir (p10 402 → 384 B).

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
  Eski motorla açılmış, cevap bekleyen bir VS de düşer (`expired`): iki turu
  aynı kurallarla oynanamaz.

### Bir kuralı değiştirmek (yeni sezon)

1. `packages/engine/src/rules.ts` içinde değeri değiştir, `ENGINE_VERSION`'ı artır.
2. `pnpm engine:simulate` — ±%20 sözünü ve süreleri kontrol et, bu dosyayı güncelle
   (`balance.test.ts` eşikleri de bekler).
3. `pnpm engine:fixtures` — parite dosyalarını yeniden üret.
4. `pnpm engine:lock` — yeni sürümü mühürle.
5. Aynı değişikliği `apps/api/app/Game/Rules.php` (ve `Run.php`) içinde yap,
   `Rules::ENGINE_VERSION`'ı eşitle; `php artisan test` PHP paritesini ve kilidi doğrular.
6. Yeni sürümün Elo hedef tablosunu ekle: `config/quezby.php` ›
   `rating.targets[ENGINE_VERSION]` (simülasyon medyanlarından; bkz. *Elo*).
   Tablo yoksa `TargetTableTest` kırılır; eski tablolar silinmez.
7. Uygulamanın yeni sürümünü yayınla ve `QUEZBY_*_MIN_VERSION`'ı yükselt; eski
   motorla açılan tur `engine_outdated` alır.

## Elo

Oyunun üç modu var, lobide altın butonun üstündeki seçiciyle seçilir:

| Mod | `RunMode` | Ne için oynanır |
| --- | --- | --- |
| **Günlük** | `daily` | Günün akışı: herkes aynı seed, günde tek hak |
| **Normal** | `free` | İstediğin kadar; skor Zirve'ye yazılır |
| **Dereceli** | `rated` | Elo ve ligindeki sıra |

Üçü de Hafta / Ay / Tüm zamanlar tablolarına yazılır; **Elo'yu yalnız
Dereceli değiştirir** (CS2'nin rekabetçi modu gibi). Dereceli, oyuncunun
**20 sayılan Normal ya da Günlük** turundan sonra açılır (`ranked`, skor > 0;
`rating.unlock_runs`). Açılmadan başlatılan dereceli tur `409 rated_locked`
alır. Bir kez dereceli oynayan oyuncu için bir daha kilitlenmez. İlerleme
`unlock` olarak `/rating`'de ve bitişin `leagueUnlock`'ında
gelir; kilidi açan turda `remaining: 0` ile.

Oyuncunun **ligi, Elo'sunun kademesidir**: 0–999 Bronz, 1000–1999 Gümüş,
2000–2999 Altın, 3000–3999 Platin, 4000–4999 Elmas, 5000 ve üstü
**MasterClass** (tavansız). Taban 0. Her şeyi API hesaplar
(`App\Services\Rating`); telefon yalnızca çizer.

**Her dereceli tur bir hedefe karşı maçtır.** Rakip yok; onun yerine reytinge göre bir
*hedef skor* var: o reytingdeki oyuncunun tipik (medyan) skoru. Hedef tablo
motor sürümüne bağlıdır (`quezby.rating.targets`), her 1000 reytingde bir çapa,
arası geometrik (motorun skorları bir beceri basamağında 2–3 katına çıkar):

| Reyting | 0 | 1000 | 2000 | 3000 | 4000 | 5000 | 6000 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hedef (motor v3) | 8 B | 33,7 B | 99 B | 238 B | 475 B | 792 B | 1,09 M |
| Hedef (motor v2, geç onaylar için) | 8 B | 34 B | 100 B | 240 B | 480 B | 800 B | 1,1 M |

- `P(skor)`: skorun, hangi reytingin tipik skoru olduğu (tablonun tersi).
- **Değişim** `Δ = round(100 × tanh((P − R) / W))`: hedefi geçen artar,
  altında kalan düşer; ne kadar farkla, o kadar çok, **asla ±100'ü aşmaz**.
  `W = 800`; yerleşmeden sonraki 15 turda ve 30+ gün aradan sonra dönüşte 5
  turda `W = 400` (iki kat hızlı).
- Oyuncuya gösterilen **hedef**, gerçek hedefin yüze yukarı yuvarlanmışıdır:
  onu tutturan asla kaybetmez.
- **Yerleşme:** ilk 3 dereceli sonuç reytingi gizli tutar; 3.'sü
  `clamp(P(medyan), 1200, 1800)` ile yerleştirir, herkes Gümüş'te başlar
  (`rating.placement_runs`). Normal ve Günlük turlar yerleşmeye sayılmaz;
  Elo'dan önce oynanmış turlardan tohumlama yoktur.
- **Terfi kalkanı:** yeni bir kademeye giren oyuncu 3 tur boyunca o kademenin
  tabanının altına düşmez. Yalnız normal tur sonuçlarında; hükmen kayıp
  kalkanı deler.
- **Bronz'da kayıp yarıdır** (yukarı yuvarlanır).

| Tur | Elo'ya etkisi |
| --- | --- |
| Dereceli tur (`ranked`) | Hemen sayılır |
| Normal tur, Günün akışı, VS | Hiçbir etkisi yok (Normal ve Günlük, Dereceli'nin kilidine sayılır) |
| `review` | Bekler; moderatör onaylarsa **onay anındaki** reytinge, turun kendi motor sürümünün tablosuyla sayılır |
| Oynanışından sert bayrak (`wall_clock`, `fast_decisions`, `hold_bounds`, `client_mismatch`, `checkpoint_*`, `slow_motion`) | **Hükmen kayıp**: −100 (Bronz'da −50) |
| Yarım bırakılan (`abandoned`), süresi dolan (`expired`), motorun reddettiği (`rejected`) | **Hükmen kayıp** |
| Yasaklı oyuncunun, yalnız `device_integrity` bayraklı, eski sezonun turu | Sayılmaz (`void`) |
| Geri sayımda iptal (`POST /runs/{id}/cancel`, ilk 5 sn) ya da hiç reel görmeden 30 sn içinde biten | Sayılmaz |

Hükmen kayıp bir kaçış kapısını kapatır: kötü giden bir turu bağlantıyı kesip
yenisini başlatarak ya da bozuk bir kayıt göndererek yok etmek. Oyundan çıkmak
turu **o anki skoruyla** gönderir; kaçmak asla ondan iyi değildir. Telefon,
yeni tura başlamadan önce ağ yüzünden bekleyen bitişini gönderir, geri sayımda
vazgeçilen turu iptal eder.

**Moderasyon:** reddedilen bir tur yalnızca **kazandırdığını** geri alır (bir
kez; `reversal`); kaybettirdiği ve hükmen kayıplar kalır. Yasaklı oyuncunun
reytingi donar ve Elo tabelasında görünmez.

**Lig sıralaması** (lig ekranı): satrançtaki gibi, ligin kendisi Elo'nun
kademesidir ve sıralaması **hiç sıfırlanmaz**. Haftalık grup, hafta kapanışı
ve Elo bonusu yoktur. Lig ekranı, oyuncunun liginde son 14 günde dereceli
oynamış oyuncuları Elo'ya göre sıralar (`GET /ratings?scope=league`,
`rating.board_active_days`); oyuncunun satırı altta sabit durur, bir üsttekini
geçmek için gereken Elo'yla. Yerleşmemiş oyuncunun lig sıralaması yoktur.
Hafta / Ay / Tüm zamanlar skor tabloları bundan ayrıdır ve aynen sürer; gün
satırı hiçbir tur için yazılmaz.

**Sezon:** Elo taşınır (beceriye çapalı). Hedef tablo gerçek oyunculara göre
`php artisan quezby:rating:calibrate --days=30` (ya da admin paneli →
Reytingler) ile ayarlanır: son dönemde en az 10 dereceli turu olan oyuncuların medyanları,
liglerin hedef payları (Bronz %20 · Gümüş %35 · Altın %25 · Platin %13 · Elmas
%6 · MasterClass %1) tutacak şekilde çapa önerir; hiçbir şey yazmaz. Tablo
değişince reytingler sıfırlanmaz, oyuncular birkaç turda yeni dengeye kayar.

**Söz** (`tests/Unit/Rating/RatingBalanceTest.php`, motorun ±%20 sözü gibi):
motor profilleri (gerçek başparmak için −%15) kendi liglerinde durur — yeni
başlayan ~1070 ve ortalama ~1910 Gümüş, iyi ~2825 Altın, profesyonel ~3830
Platin, elit ~4540 Elmas; kusursuza yakın oyun MasterClass. Dengede sapma < 120,
tipik değişim ±75 içinde.

## Hile koruması

Telefon motoru yalnızca ekranı canlandırmak için çalıştırır; tur bittikten sonra
görünen her sayı sunucudan gelir.

1. `POST /runs` motor ve içerik sürümünü ister; eski uygulama tur açamaz
   (`engine_outdated`). Seed sunucudan gelir; oyuncunun **tek açık turu**
   olabilir (yenisi eskisini `abandoned` yapar), süresi geçen tur `expired` olur.
   İkisi de Elo'da hükmen kayıptır (bkz. *Elo*); geri sayımda iptal edilen değil.
2. Uygulama yalnızca hareketleri gönderir: her reel için `[hareket, t, d]`.
3. Sunucu PHP motoruyla tekrar oynatır; motorun reddettiği kayıt (`late_action`,
   `gesture_not_allowed`…) tur olarak sayılmaz (`rejected`).
4. **Sert bayraklar** (tur saklanır, hiçbir tabloya girmez):
   - `wall_clock`: geçen süre, uygulamanın gerçek temposundan kısa — 1,8 sn geri
     sayım + her reelin aktif süresi + karardan sonraki bekleme (0/160/260 ms) ve
     170 ms kayma, 1 sn tolerans. Tempo `@quezby/config` `PACE` ile paylaşılır.
   - `fast_decisions`: ≥30 kaydırma/beğeni isabetinin %20'den fazlası 250 ms altında
     — ama 250 ms altındaki tüm hareketlerin %10'dan fazlası yanlışsa bayrak
     kalkar (`fast_wrong_share`): her şeyi kaydıran oyuncu tahmin ediyordur,
     bot değildir; yanlış hareketlerde de aynı hızdadır. Motor v3'ten beri
     her şeyi kör kaydıran, 30 isabete varmadan kör hamle cezasıyla düşer;
     bu istisna, kimini bakarak kimini körlemesine kaydıranı korur.
   - `hold_bounds`: uygulamanın çoktan bitireceği uzunlukta bir basılı tutma.
   - `client_mismatch`: uygulamanın gösterdiği skor sunucununkiyle aynı değil.
   - `banned`: oyuncu (sessizce) yasaklı.
5. **Yumuşak sinyaller** (yalnızca zirve skorunu bekletir): karar sürelerinin
   değişim katsayısı < 0,08 (`reaction_cv`), kararların 250–280 ms'ye yığılması,
   altınların ≥%90'ı mükemmel, oyuncunun sezon rekorunun ≥3 katı, aynı telefondan
   ikinci hesabın aynı günlük akışı. Sinyalli bir skor sezonun ilk 10'una ya da
   haftanın ilk 3'üne girecekse `review` olur ve bir moderatör bakana kadar
   tabloya çıkmaz. VS turunda yumuşak sinyale bakılmaz: sıralamaya girmediği
   için bekletilecek bir skoru yoktur; yalnızca sert bayraklar sayılır.
6. Eşikler 8.000 simüle tura karşı kalibre edildi; hiçbir dürüst profil
   yakalanmaz (`tests/Unit/RunVerifierTest.php`).
7. Moderasyon: **yönetim paneli** (`apps/admin` — Şüpheliler: inceleme
   kuyruğu, bayraklı turlar, risk sırasıyla şüpheli oyuncular;
   `docs/backend/admin-api.md`), ya da `php artisan quezby:review`,
   `quezby:run:approve|reject`, `quezby:user:ban|unban`, `quezby:runs:expire`;
   SSH'sız hostlarda `POST /api/v1/ops/moderate` (`MODERATION_TOKEN`). Hangi
   yoldan yapılırsa yapılsın her karar, kimin verdiğiyle denetim kaydına geçer.
   VS turları bunun dışındadır: hiçbir yerde sıralanmadıkları için ne
   onaylanır ne reddedilir.
8. **Kontrol noktaları — yavaşlatılmış oyuna karşı.** `wall_clock` yalnızca alt
   sınırdır: yavaşlatılmış (speed-hack) bir oyun onu geçer. Bu yüzden
   sunucunun açtığı her turda (VS dahil; deneme turu hariç) uygulama, geri
   sayımdan sonraki oyun saatinin 45., 120. ve 240. saniyelerinde
   (`CHECKPOINTS.marksMs`) sunucuya kaç reel oynadığını ve tam o
   hareketlerin SHA-256 özetini (`prefixHash`) bildirir. Sunucu gördüğü anı
   imzalayıp **veritabanına yazmadan** bir makbuz döner; bitiş bu makbuzları
   taşır. Yolda kaybolan bir bildirim (yanıt yok, zaman aşımı ya da 5xx) borç
   kalır: sonraki bir kararda, hatadan en az 5 sn sonra, o ana kadarki reel
   sayısı ve özetiyle — tıpkı bir işaretinki gibi — yeniden gönderilir; bir turda
   en fazla iki kez. Sunucunun reddettiği (4xx) yeniden denenmez. Bir karar en
   fazla bir bildirim gönderir, önce yeni işaretinki. Böylece bir tur en fazla
   beş bildirim gönderir: bitişin taşıyabildiği makbuz sayısı
   (`CHECKPOINTS.maxReceipts`). Bitişte sunucu her makbuz için kaydın o kısmını
   yeniden özetler ve o hareketlerin uygulamanın temposuyla gerektirdiği süreyi,
   gerçekte geçen süreyle karşılaştırır:
   - sahte ya da başka turun makbuzu → sert `checkpoint_forged`; özet tutmuyor
     (geçmiş sonradan değiştirilmiş) → sert `checkpoint_mismatch`;
   - gerçek süre, gereken sürenin 1,35 katı + 10 sn'den uzun → sert `slow_motion`;
     1,2 katı + 6 sn'den uzun → yumuşak `slow_timing`;
   - beklenen makbuz eksik (bağlantı yeniden denemelerde de yok) → yumuşak
     `checkpoint_missing`.
   Uygulamanın temposu ile modelin temposu birebir örtüşür:
   - reel ilk çizildiği karede canlanır;
   - kaydırma, tanındığı an sayılır ve reel o anda gider.

   Modelin görmediği yalnızca geç çalışan zamanlayıcılar ve reel başına bir
   çizim karesidir. Rahat, sürükleyerek kaydırmak dürüst bir turu yavaş
   göstermez. `RunVerifierTest`'in "dürüst telefon" örnekleri, reel başına
   45 ms'de çizen bir telefonu da içerir.
   Maliyet: bir turda en fazla beş küçük istek (çoğunlukla üç); bir tur bitişinin
   tamamı (tekrar oynatma dahil) yerelde ~7 ms, en uzun turun tekrarı ~2,5 ms.
9. **Cihaz bütünlüğü — rootlu cihaz, emülatör, değiştirilmiş uygulama.**
   Uygulama, tek kullanımlık bir sunucu challenge'ına karşı Android'de **Google
   Play Integrity** (standard request, `requestHash = sha256Hex(challenge)`), iOS'ta
   **App Attest** (kurulumda anahtar onayı, sonra imzalı assertion) belgesi
   üretir; sunucu doğrular ve kararı saklar (`pass` 6 sa, `fail` 12 sa geçerli).
   Tur başlarken oyuncunun geçerli kararı tura yazılır (`runs.device_verdict`).
   `QUEZBY_INTEGRITY_MODE=enforce` iken:
   - `fail` → sert `device_integrity`: oyuncu oynar ama turları **hiçbir tabloya
     girmez**; sonuç ekranı "Bu cihazda skorlar sıralamaya girmiyor" der
     (`flagReason: 'device'`).
   - karar yok (Google servisleri olmayan Huawei'ler, eski cihazlar, simülatör,
     Google/Apple'a ulaşılamadı) → yumuşak `device_unverified`: turlar sıralamaya
     girer, zirveye girecek skor incelemeye düşer.
   `log` (yerel/staging) kararları tura yazar ama durumu değiştirmez; `off` kapatır.
   Doğrulama tur başına değil, cihaz başına aralıklarla yapılır (Google'ın
   günlük kotası ve sunucu yükü için).

Bu, "skoru elle POST etmek" türü hileyi tamamen, rootlu cihaz/emülatör ve
yavaşlatma hilesini büyük ölçüde engeller; insan gibi davranan iyi bir botu ise
yalnızca zorlaştırır (zirvede incelemeyle yakalanır). Tam koruma istemci
tarafında imkânsızdır; şüpheli turlar `runs.flags` alanında (sert/yumuşak)
saklanır.
