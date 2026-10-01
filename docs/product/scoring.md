# Puanlama ve zorluk — Engine v3 (kilitli)

**Kod:** `packages/engine/src/rules.ts` (TS) · `apps/api/app/Game/Rules.php` (PHP ikizi)
**Kilit:** `packages/engine/rules.lock.json` · **Denge raporu:** `pnpm engine:simulate`
**Parite testleri:** `packages/engine/fixtures/*.json` → `apps/api/tests/Unit/EngineParityTest.php`

Quezby sonsuz bir oyundur: reel akışı hiç bitmez, ama her reel bir öncekinden
biraz daha zordur ve **dopamin barı her reelde biraz daha hızlı erir**. Er ya da
geç herkes düşer; soru kimin ne kadar uzağa gittiğidir. **En uzun tur yaklaşık
6 dakikadır:** 5. dakikadan sonra erime en hızlı başparmağı da geçer.

Puan sisteminin iki sözü var:

1. **Aynı yetenek, aynı süre → ±%20.** 4 dakikalık bir turda 1000 yapan
   oyuncu, başka bir 4 dakikalık turda 800 ile 1200 arası yapar. Kombolar her
   turu farklı kılar, ama şans bir turu ikiye katlayamaz.
2. **Kurallar kilitli.** Bir kuralı değiştirmek sessiz bir düzenleme değil,
   yeni bir sezondur (aşağıda: *Kilit ve sezonlar*). Mağaza yayınından önce
   sahip sürümü koruyup kuralı yerinde değiştirebilir: v3 böyle, 2026-10-01'de
   "kısa oyun" ile yeniden mühürlendi.

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

**Ağır postlar seyrek ve dağınık gelir.** Altın ve kırmızı post, oyunu en çok
yavaşlatan ve (geç dakikalarda) barı en çok eriten postlardır. Bu yüzden her 10
ardışık postta:

| Seviye (post) | En fazla altın | En fazla kırmızı |
| --- | --: | --: |
| 1–8 (ilk 160 post) | 1 | 1 |
| 9–16 (160–319) | 1 | 2 |
| 17 ve üstü (320+) | 2 | 2 |

İki kırmızı asla yan yana gelmez. Sınırı dolan tür gelirse post sıradan olur;
arkadaş postunun sınırı yoktur. Sınırlar puana değil post sırasına bağlıdır:
aynı seed'i oynayan herkes (Günün akışı, VS) ve Dereceli'nin her zorluğu aynı
postları görür. Sınırsız v3'te 10 postluk pencerelerin %30'unda 2+ altın
geliyordu; artık seviye 17'ye kadar hiç gelmez.

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
| 0 | 2200 ms | 2450 ms | 990 ms | 1200 ms | %20,0 | %25,0 | 6,0 %/sn | x1,00 |
| 100 | 1258 | 1508 | 566 | 847 | %13,5 | %35,0 | 7,9 | x2,00 |
| 200 | 1014 | 1264 | 456 | 755 | %11,8 | %39,2 | 10,6 | x3,00 |
| 400 | 838 | 1088 | 400 | 689 | %10,6 | %43,1 | 17,9 | x5,00 |
| 600 | 767 | 1017 | 400 | 662 | %10,1 | %45,0 | 28,0 | x7,00 |

- Pencere 600 ms'nin altına **asla** inmez (insan tepki + hareket süresi).
- Dokunma süresi pencerenin %45'i, en az 400 ms; altın dolum 1200 → 600 ms.
- Dopamin erimesi `60 + ⌊n / 6⌋ + ⌊n² / 3000⌋` binde/saniye: ilk 100 postta
  eski doğrusal erimeye (`55 + ⌊n / 5⌋`) yakın, sonra giderek dikleşir (400.
  postta 13,5 yerine 17,9, 600.'de 17,5 yerine 28 %/sn). **Sınırsız artar**,
  bu yüzden mükemmel oynayan bir bot bile düşer; en hızlısı ~6. dakikada.
- Özel reel payı %25'ten %50'ye yaklaşır; art arda en fazla 3 özel reel gelir.
  Altın ve kırmızı ayrıca 10'luk pencere sınırına bağlıdır (*Dört reel*): payın
  büyüyen kısmı çoğunlukla arkadaş postudur.

## Dopamin barı (can)

Bar 1000'den (%100) başlar, reel ekrandayken saniyede `erime(n)` kadar düşer.

| Olay | Bar |
| --- | --- |
| Sıradan reeli kaydırmak | +80 |
| Arkadaşı beğenmek / dokunmadan beklemek | +90 |
| Altın reeli yeşilde bırakmak | +100 (mükemmelse +60 daha) |
| Süreyi kaçırmak / yanlış hareket | −250 |
| Altında erken ya da geç bırakmak | −150 |
| Dokunma reeline dokunmak | −300 |

Bar bir reelin ortasında biterse tur o anda biter (`drained`); bir ceza onu
sıfıra indirirse de biter (`penalty`).

### Kör hamle (motor v3)

Reel canlandıktan sonraki **ilk 300 ms içinde** (`blindMs`) yanlış posta
kaydırmak ya da çift dokunmak **kör hamledir**: o sürede postun ne olduğuna
bakılamaz. İlk kör hamle normal ceza alır (−250); arkasından gelen her kör
hamlede ceza **ikiye katlanır**: −500, −1000. Üçüncüsü turu her zaman bitirir.

- Sayaç **düşünülmüş bir isabetle** sıfırlanır: 300 ms ya da daha geç bir
  kaydırma/beğeni isabeti, bir altın isabeti ya da dokunulmadan geçilen bir
  dokunma reeli. Hızlı (300 ms altı) kaydırma isabetleri sayacı sıfırlamaz.
- Kör sayılmayanlar: süreyi kaçırmak, altında erken/geç bırakmak, bir postu
  basılı tutmak ve dokunma reeline dokunmak (onun zaten kendi, en ağır cezası
  var). Dokunma reelinde parmak ilk temasta yakalanır; o da kör sayılsaydı
  hızlı ama dürüst oyuncular gereğinden sert cezalanırdı.
- Amaç, bakmadan (iki parmakla, art arda) kaydırarak puan toplamayı bitirmek:
  motor v2'de her şeyi kaydıran bir oyuncu medyanda 7–8 B, en iyi %10'da
  20–38 B yapıyordu; artık 10–45. postta (medyan 15) düşer, ~4 B yapar, en
  fazla ~17 B.
- Katlanma 2026-10-01'e kadar ilk kör hamlede başlıyordu: 300 ms'de oynayan
  dürüst ama hızlı oyuncunun tek hatası da iki kat yiyor, %5 hatada 400
  ms'lik oyuncudan az puan alıyordu. Artık yalnız art arda kör hamle katlanır.
- Oyunda kör hamle "Bakmadan!", ikinciden itibaren altında "Ceza x2" (x4)
  olarak görünür (`Step.blind`, `blindFactor`).

## Puan

```
ℓ          = ⌊n / 20⌋                              (seviye − 1)
L          = 1000 + 200 · ℓ                        seviye çarpanı, binde
kombo c    : isabet → min(1500, c + 50)            her isabet +0,05
             hata   → 1000 + ⌊(c − 1000) / 2⌋       x1'in üstü yarıya iner
reel puanı = ⌊(taban + bonus) · L · c / 1.000.000⌋
```

| | Sıradan | Arkadaş | Altın | Dokunma |
| --- | --: | --: | --: | --: |
| Taban | 100 | 120 | 150 | 120 |
| Bonus | hız: 0 → taban | hız: 0 → taban | hassasiyet: 0 → 150 | — |

- **Seviye çarpanı katlanır:** x1,00'dan başlar, her seviye +0,20 ekler —
  10. seviyede x2,80, 20.'de x4,80, 30.'da x6,80. Uzun ve hızlı bir turun son
  postları ilk postlarından kat kat değerlidir; çarpanın sınırı turu bitiren
  erimedir. (2026-10-01'e kadar çarpan 11. seviyede x2'ye varıp duruyordu:
  uzun tur az ödüllendiriliyordu.)
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
bırakma isabeti) ile ölçüldü. **Süre, oyuncunun gördüğü saattir:** 1,8 sn geri
sayım + aktif süre + her postun ardından karar bekleme (0/100/200 ms), 140 ms
kayma ve bir çizim karesi. Bir profilin tepki süresi, reelin çizildiği
kareden hareketin tanındığı ana kadar geçen süredir.

| Profil | Reel p50 | Süre p10 / p50 / p90 | Skor p10 / p50 / p90 | Aynı süre (±%10) p10/p50 · p90/p50 | İsimli kombo payı |
| --- | --: | --- | --- | --- | --: |
| Yeni başlayan | 115 | 0:43 / **1:44** / 2:38 | 11 B / **39 B** / 74 B | **0,88 · 1,17** | %7 |
| Ortalama | 219 | 1:49 / **2:50** / 3:40 | 56 B / **113 B** / 174 B | **0,87 · 1,14** | %12 |
| İyi | 329 | 2:52 / **3:50** / 4:22 | 166 B / **267 B** / 343 B | **0,85 · 1,12** | %24 |
| Profesyonel | 439 | 3:55 / **4:36** / 5:06 | 392 B / **518 B** / 631 B | **0,86 · 1,14** | %31 |
| Kör kaydıran (150–250 ms, her reel) | 15 | — | **~4 B** (en fazla ~17 B) | — | — |

- **±%20 sözü dört profilde de tutuyor.** Engine v1'de aynı ölçüm
  0,74–0,77 / 1,26–1,41 idi: sıfırlanan x1→x5 kombo gürültü, sınırsız seviye
  çarpanı süreyi skora üslü yansıtıyordu. Katlanan çarpan skorları daha geniş
  yayar (yeni başlayanda p90/p10 ≈ 7), ama aynı uzunluktaki turlar ±%20'de
  kalır.
- Yetenek skora belirgin yansır (her basamak 1,9–2,9 kat); aynı tohumla
  (Günün akışı) da kural tutar.
- 2026-10-01'e kadar (aynı v3, kısa oyundan önce) süreler 2:02 / 3:27 / 5:10 /
  7:21, skorlar 40 / 103 / 238 / 494 B idi; altın ve kırmızı sınırsızdı,
  özel postlar ilerledikçe 10 postta 3'ten 4'e çıkıyordu.
- Aynı eşikler `packages/engine/src/__tests__/balance.test.ts`'te kilitlidir
  (400 tur/profil): biri bozulursa test kırılır.

### Hız ve hata

Botlar iki sayıyla oynar: karar hızı (700 → 300 ms) ve hata oranı. "%X hata",
her postta %X ihtimalle o postun hatası demektir: sıradanda çift dokunma,
arkadaşta kaydırma, altında yeşilin dışında bırakma, kırmızıda dokunma
(`ErrorBot`). 300 ms, bir insanın `fast_decisions` bayrağına takılmadan
inebileceği en hızlı tempodur. Hücreler 300 turun medyan skoru ve süresidir.

| Refleks | %0 | %1 | %5 | %10 | %15 | %20 | %25 | %30 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **700 ms** | 173 B · 4:11 | 158 B · 4:03 | 91 B · 3:11 | 24 B · 1:21 | 9 B · 0:41 | 5 B · 0:27 | 3 B · 0:20 | 2 B · 0:16 |
| **600 ms** | 292 B · 4:57 | 259 B · 4:45 | 144 B · 3:39 | 38 B · 1:35 | 11 B · 0:41 | 6 B · 0:26 | 3 B · 0:20 | 2 B · 0:15 |
| **500 ms** | 450 B · 5:15 | 402 B · 5:03 | 235 B · 4:01 | 57 B · 1:47 | 16 B · 0:47 | 7 B · 0:28 | 4 B · 0:19 | 2 B · 0:15 |
| **400 ms** | 735 B · 5:28 | 659 B · 5:16 | 382 B · 4:14 | 97 B · 1:57 | 22 B · 0:46 | 9 B · 0:27 | 5 B · 0:19 | 3 B · 0:14 |
| **300 ms** | 1,11 M · 5:42 | 999 B · 5:31 | 590 B · 4:28 | 154 B · 2:08 | 26 B · 0:43 | 10 B · 0:24 | 6 B · 0:17 | 3 B · 0:13 |

- **1M yalnız en hızlıya açık:** 300 ms kusursuzsa her turda, %1 hatayla
  turların %48'inde. 400 ms kusursuz oynasa da 1M'ye varmaz.
- **500 bin zordur:** 400 ms ve en fazla %1 hata (turların %97–100'ü), ya da
  300 ms ve %5 hata (%67). Oyuna alışmış 500 ms'lik oyuncu kusursuz oynasa
  bile turların %1'inde geçer.
- **En uzun tur ~6 dakikadır:** 2000 kusursuz 300 ms turunun en uzunu 5:59.
- Gerçek oyuncu hatasını çoğunlukla altın ve kırmızıda yapar; profillerin
  karışık hata payı: yeni başlayan ~%10, ortalama ~%7, iyi ~%5, profesyonel
  ~%3, elit ~%1,6.
- Bu sözler `balance.test.ts` → *speed and errors*'ta kilitlidir.

## Kilit ve sezonlar

`packages/engine/rules.lock.json` motor sürümünü, **her kuralın** (kanonik
JSON'un SHA-256'sı) ve iki motorun oynadığı **fixture'ların** hash'ini, birkaç
altın skoru ve geçmişi tutar.

- TS (`lock.test.ts`) ve PHP (`tests/Unit/RulesLockTest.php`) testleri kural ya
  da davranış değiştiği anda kırılır.
- `pnpm engine:lock` yalnızca `ENGINE_VERSION` arttıysa yeniden mühürler; aynı
  sürümde değişmiş kuralları **reddeder**.
- **Yayından önce, yerinde:** mağaza yayınına kadar sahip sürümü koruyup bir
  kuralı yerinde değiştirebilir (staging'de korunacak bir sezon yoktur).
  `pnpm engine:lock -- --reseal` aynı sürümün mührünü (iki kilitte de)
  değiştirir; geçmişte sürüm başına tek mühür kalır. Motor v3, 2026-10-01'de
  kısa oyunla böyle yeniden mühürlendi. Staging'de API ile uygulama birlikte
  güncellenmelidir: eski uygulamanın turları yeni kurallarla tutmaz
  (`client_mismatch`). Yayından sonra bu yol kapalıdır: canlı bir sürümde
  değişen oyun, tek tabloda iki oyunu sıralar.
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

Hafta / Ay / Tüm zamanlar tablolarına (Zirve) **yalnız Normal ve Günlük**
yazılır; **Elo'yu yalnız Dereceli değiştirir** (CS2'nin rekabetçi modu gibi)
ve dereceli tur hiçbir skor tablosuna yazılmaz. Dereceli, Elo arttıkça
zorlaşır (*Dereceli zorluğu*). Dereceli, oyuncunun
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

| Reyting | 0 | 1000 | 2000 | 3000 | 4000 | 5000 | 6000 | 7000 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Hedef (motor v3, zorluk tablosu 2)** | 8 B | 29,9 B | 90 B | 97,3 B | 130 B | **178,7 B** | 310,6 B | 529,7 B |
| Hedef (motor v3, zorluk tablosu 1, eski turlar) | 8 B | 31,6 B | 74,1 B | 148,3 B | 265,7 B | 394 B | 542,3 B | — |
| Hedef (motor v3, zorluk 0: yerleşme ve tablodan önceki turlar) | 8 B | 33,1 B | 109 B | 267,2 B | 497,6 B | 840,4 B | 1,16 M | — |
| Hedef (motor v2, geç onaylar için) | 8 B | 34 B | 100 B | 240 B | 480 B | 800 B | 1,1 M | — |

Zorluk tablosu 2'nin merdiveni insanlara göre kurulu (2026-09-30; kısa oyunla
2026-10-01'de aynı çapalarla yerinde yeniden hesaplandı): 1000'de yeni
başlayan, 2000'de ortalama oyuncunun bir alt zorluktaki tipik skoru (kısa
oyunda skorları daha geniş yayıldığı için), 4000'de iyi oyuncunun tipik skoru;
**MasterClass'ın kapısı (5000) iyi ile profesyonelin ortası** — zorluk 16'da
tur başına ~179 bin, 3 dakikadan kısa temiz oyun. 6000 profesyonel, 7000
elit. Tablo 1 kapıyı en iyi simüle oyuncunun bile ötesine koymuştu (394 B):
kimse MasterClass olamıyordu. Zorluk 0 tablosunun çapaları da aynı profillere
bağlı kaldı (1000 yeni başlayan, 2000 ortalama, 3000 iyi, 4000 profesyonel,
5000'in ötesi elit).

Yerleşmiş oyuncunun dereceli turu, oynadığı zorluk tablosunun hedefleriyle
ölçülür (`rating.difficulty.targets[motor][zorluk tablosu]`): her reytingin
**kendi zorluğundaki** tipik skoru. Yerleşme turları zorluk 0'da oynanır ve
motorun kendi tablosuyla (`rating.targets[motor]`) ölçülür.

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

**Elle düzeltme:** yalnızca bir sahip, yönetim panelinden bir oyuncunun
reytingini (qb) sebebiyle birlikte elle koyabilir (`adjust`, oyuncunun
geçmişinde "Düzeltme"; denetim kaydında `player.rating`, eski ve yeni
değerle). Yerleşmemiş oyuncu yerleşir ve Dereceli ona açılır; yerleşmeden
sonraki geçici dönem başlar. Tur oynanmadığı için sayılan tur ve son sayılan
tur anı değişmez — Elo tabelasına bir sonraki dereceli turuyla girer. Reyting
o an değiştiği için eşitlikte o reytinge önce ulaşan önde kalır; yeni lig
terfi kalkanının ligi değilse kalkan düşer.

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
zorluk 0'da, motorun kendi tablosuyla, motor profilleri (gerçek başparmak
için −%15) kendi liglerinde durur — yeni başlayan ~1060 ve ortalama ~1910
Gümüş, iyi ~2830 Altın, profesyonel ~3800 Platin, elit ~4550 Elmas. Dereceli
merdiveninde (her tur reytinginin zorluğunda, zorluk tablosu 2'nin
hedefleriyle) yerleri: yeni başlayan ~1070 ve ortalama ~1980 **Gümüş**, iyi
~3740 **Platin**, profesyonel ~5700 ve elit ~6690 **MasterClass**. İyi oyuncu
4500'ün altında kalır; MasterClass'taki profesyonel ve elit sakindir (sapma
< 100, tipik değişim ±70 içinde). Kısa oyunda yeni başlayan, ortalama ve iyi
oyuncunun turları daha geniş yayıldığı için reytingleri tur başına daha çok
oynar (sapma < 150, tipik değişim ±100; zorluk 0 tablosunda ±85), ligden
taşmaz. Motorun kendi hedefleriyle elit Elmas'a bile çıkamazdı.

## Dereceli zorluğu

qb arttıkça Dereceli zorlaşır. Sunucu dereceli turu açarken oyuncunun o
anki reytinginden bir **zorluk** (0–16) seçer, seed'le birlikte verir
(`StartRunResponse.difficulty`) ve turu o zorlukla tekrar oynatır. Uygulama
turu `new Run(seed, difficulty)` ile oynar; motorun sürümü değişmez.

| qb | Lig | Zorluk |
| --- | --- | --- |
| Yerleşme turları, 0–999 | — / Bronz | 0 (oyun olduğu gibi) |
| 1000–1999 | Gümüş | 1–4 (her 250 qb'de bir) |
| 2000–2999 | Altın | 5–8 |
| 3000–3999 | Platin | 9–12 |
| 4000–4749 | Elmas | 13–15 |
| 4750 ve üstü | Elmas, MasterClass | 16 (tavan) |

Normal, Günlük, VS ve deneme turu hep zorluk 0'dadır. Zorluk, terk edilen
açık tur hükmen sayıldıktan **sonra** hesaplanır (`rating.difficulty.from`,
`step`).

**Zorluk tablosu 2 (2026-09-30): akış her zorlukta aynı, yalnız barın
ekonomisi sıkılaşır** (`z` zorluk, `packages/engine/src/difficulty.ts` ·
`apps/api/app/Game/Difficulty.php`):

| | Kural | z = 4 | z = 8 | z = 12 | z = 16 |
| --- | --- | --: | --: | --: | --: |
| İsabetin dopamini | kazanç × `(1000 − 12·z)` binde; **mükemmelin +60'ı kesilmez** | ×0,95 | ×0,90 | ×0,86 | ×0,81 |
| Hatanın kaybı | bar kayıpları × `(1000 + 40·z)` binde | ×1,16 | ×1,32 | ×1,48 | ×1,64 |

Reeller, pencereler, özel reel payı, beğeni/basılı tut/dokunma ağırlıkları
ve dopamin erimesi zorluk 0 ile birebir aynıdır: ekrana gelen hiçbir şey
değişmez. z = 16'da kaydırma 80 yerine 64, basılı tut 100 yerine 80 dopamin
verir (mükemmelse +60 yine tam); süre aşımı 250 yerine 410, yakalanma 300
yerine 492 götürür. Kör hamle katlaması büyümüş cezanın üstüne gelir.
Zorluk 0 v3'ün ta kendisidir: `rules.lock.json`, bütün fixture'lar ve altın
skorlar aynı kalır.

Tablo 1 (2026-09-30'a kadar) engel payını z = 16'da +%24 artırıyor, beğeniyi
dokunmaya kaydırıyor ve erimeyi ×1,38 hızlandırıyordu: MasterClass'ta
akışın ~%55'i altın "basılı tut" ve kırmızı "dokunma" reeli oluyordu, tur
beklemeye dönüyordu. Tablo 2 bunu bırakıp zorluğu yalnız dikkatten ister.

**Denge** (600'er simüle tur, `pnpm engine:simulate`; her profil
qb'sinin Dereceli merdiveninde ulaştığı zorlukta):

| Profil (lig) | Zorluk | Skor p50 | Süre p50 | Aynı süre ±%10 |
| --- | --: | --- | --- | --- |
| Yeni başlayan (Gümüş) | 1 | 39 B → 35 B (−%11) | 1:44 → 1:35 | ±%20 içinde |
| Ortalama (Gümüş) | 4 | 113 B → 89 B (−%21) | 2:50 → 2:24 | ±%20 içinde |
| İyi (Platin) | 12 | 270 B → 138 B (−%49) | 3:50 → 2:28 | ±%20 içinde |
| Profesyonel (MasterClass) | 16 | 520 B → 311 B (−%40) | 4:37 → 3:17 | ±%20 içinde |
| Elit (MasterClass) | 16 | 781 B → 530 B (−%32) | 5:10 → 4:03 | ±%20 içinde |

- ±%20 sözü her profilde, oynadığı zorluklarda tutar; hiçbir zorluk bir
  alttakinden kolay değildir ve hiçbir profile daha çok puan ya da daha uzun
  tur getirmez; tepede en iyilerin skorunun beşte biri ile yarısı arası
  gider, tur en az %15 kısalır, hiçbir zaman umutsuz değildir
  (`balance.test.ts` → *difficulty balance*).
- Ortalama bir oyuncu zorluk 16'da ~1:08 oynar, ~31 B yapar.
- Dereceli tur skor tablolarına yazılmadığı için zorluk hiçbir tabloyu
  bozmaz; qb'yi zorluk tablosunun hedefleri dengeler (*Elo*).

### Zorluk tablosunu değiştirmek (yeni sezon değil)

Zorluk tablosu kurallardan ayrı mühürlüdür: `packages/engine/difficulty.lock.json`
(TS `lock.test.ts`, PHP `tests/Unit/DifficultyLockTest.php`), fixture'ı
`packages/engine/fixtures/difficulty.json` (`DifficultyParityTest`).

1. `difficulty.ts` içinde tabloyu değiştir, `DIFFICULTY_VERSION`'ı artır;
   aynısını `Difficulty.php`'de yap, `Difficulty::VERSION`'ı eşitle. Eski
   sürümün hedef tablosunu `config`'te bırak: o sürümle açılmış turlar onunla
   ölçülür (`TargetTable::forRun`).
2. `pnpm engine:simulate` — zorluk raporu ve `balance.test.ts` tutmalı.
3. `pnpm engine:fixtures`, `pnpm engine:lock`.
4. Yeni Elo hedeflerini ekle: `config/quezby.php` ›
   `rating.difficulty.targets[ENGINE_VERSION][DIFFICULTY_VERSION]`
   (simülasyon medyanlarından ya da `quezby:rating:calibrate`), ve
   `RatingBalanceTest`'in zorluk medyanlarını güncelle.
5. Uygulamayla birlikte yayınla: eski tabloyu oynayan uygulama dereceli tur
   açamaz (`engine_outdated`). Skor tabloları ve sezon aynen sürer.

Motor sürümü artınca zorluk fixture'ları da değişir: yeni sezon, zorluk
tablosunun da yeni sürümüdür.

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
     sayım + her reelin aktif süresi + karardan sonraki bekleme (0/100/200 ms) ve
     140 ms kayma, 1 sn tolerans. Tempo `@quezby/config` `PACE` ile paylaşılır.
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
   tabloya çıkmaz. Skor tablosuna hiç yazılmayan dereceli tur ise, oyuncuyu
   Elo tabelasının ilk 10'una taşıyacaksa (`review_top_rating`) `review` olur
   ve onaylanana kadar Elo'ya sayılmaz. VS turunda yumuşak sinyale bakılmaz: sıralamaya girmediği
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
