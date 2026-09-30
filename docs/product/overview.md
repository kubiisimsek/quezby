# Quezby — ürün

**Quezby, reels kaydırma alışkanlığını rekabetçi bir refleks oyununa çevirir.**

Sonsuz bir dikey akış. Her reel ne istediğini rengiyle ve rozetiyle söyler;
oyuncunun yıllardır "yukarı kaydır"a programlanmış başparmağı çoğu reelde
doğru çalışır — ve oyunun bütün gerilimi, o refleksin **yanlış** olduğu
anlarda doğar (psikolojideki Go/No-Go testi). Ekranın üstünde bir **dopamin
barı** sürekli erir; doğru hareket doldurur, hata boşaltır. Bar bitince:
"Dopamin bitti. Sıkıldın, uygulamayı kapattın."

Hedef: oyuncu **her gün bir kez girip bir tur oynasın**. Her şey bu tek turu
anlamlı kılmak için var.

## İlk açılış

İlk kez giren oyuncuyu önce oyun karşılar, form değil (Apple'ın _Onboarding
for Games_ rehberi). Hesap, oyuncu oyunu gördükten sonra açılır; hesabı belli
olmadan hiçbir şey sorulmaz. Oyun **telefonun dilinde** açılır — Türkçe,
İngilizce, Almanca, Arapça, Fransızca ya da İspanyolca; telefonun dili
bunlardan biri değilse İngilizce. Karşılamadaki küçük dil düğmesi daha
oynamadan başka dil seçtirir ([localization.md](./localization.md)).

1. **Karşılama:** marka, dört hareketin taşları ve tek altın **Oyna**. Hesap
   açılmaz, hiçbir şey sorulmaz.
2. **Nasıl oynanır — deneme turu:** gerçek kurallarla bir tur, ama tamamen
   telefonda ve hesapsız — sunucuya hiç gitmez, **hiçbir yere sayılmaz**
   (tablo, lig, istatistik, rekor). Her hareketin ilk postundan önce akış
   durur ve bir koç kartı onu anlatır; postun süresi "Anladım"dan sonra
   başlar. Sonuç "DENEME TURU" etiketlidir; turun bitmeden göremediği
   hareketler orada anlatılır. **Devam et** giriş ekranına, **Bir daha dene**
   aynı tura götürür.
3. **Giriş yap:** üstte e-posta ve şifreyle giriş (altında **Şifremi
   unuttum**), sonra **Hesabın yok mu? Kayıt ol**, "ya da" ile **Apple ile
   devam et** / **Google ile devam et**, en altta **Misafir olarak devam et**.
   Apple ve Google, hesabı varsa onu bulur, yoksa açar.
   - **Kayıt ol:** e-posta, şifre ve **Şifreyi doğrula**. E-postanın hesabı
     varsa "Bu e-postayla bir hesabın var." der ve girişe götürür.
   - **E-postanı doğrula:** e-postaya kayıt olunan dilde 6 haneli bir kod
     gider; kod girilmeden hesap açılmaz. Kod 15 dakika geçerli, yenisi bir
     dakika sonra istenir, 5 yanlış denemede kod biter (yenisi istenebilir).
     Doğrulanmamış bir kayıtla giriş yapan oyuncuya yeni kod gider ve bu ekran
     açılır.
   - **Şifremi unuttum:** e-postaya kod gider; kod ve yeni şifre (iki kez)
     girilince diğer telefonlardaki oturumlar kapanır, bu telefon girer.
   Her yeni hesap sunucudan `guest48128742` gibi bir ad alır.
4. **Takma ad — yalnızca giriş yapana:** "Sana ne diyelim?" Apple, Google ya
   da e-postayla giren oyuncuya, hesabın adı hâlâ otomatikse sorulur;
   **Şimdilik geç** denebilir. Ad hesap belli olduktan sonra sorulduğu için,
   eski hesabına giren oyuncu adını zaten seçmişse soru hiç gelmez. Misafire
   sorulmaz: otomatik adla oynar, adını sonra Profil'den seçer. Seçilen ad
   kalıcıdır, bir daha değişmez.
5. **Analitik izni:** **"Oyunu birlikte geliştirelim mi?"** (**İzin ver /
   İzin verme**). Cevap gelmeden hiçbir kullanım verisi sayılmaz
   ([analytics.md](./analytics.md)); bu yüzden önceki adımlar hiç sayılmaz.
   Hesap başka bir telefonda evet dediyse sorulmaz.
6. **Bildirimler:** "Haberin olsun mu?" — biri seni eklediğinde, bir
   arkadaşın VS attığında ya da mesaj gönderdiğinde. **Bildirimleri aç**
   telefonun kendi sorusunu getirir; **Şimdi değil** sonraya bırakır. Adım
   yalnızca soru hâlâ sorulabiliyorsa görünür: bildirimler zaten açıksa,
   telefon artık sormuyorsa ya da sürümde push yoksa atlanır.

Adımlar telefonda saklanır ve uygulamayla silinir. Deneme turu bir kez
oynanınca karşılama ve tur bir daha gösterilmez: hesaptan çıkan oyuncu
doğrudan giriş ekranına döner. 4–6 hesaba bağlıdır: uygulamayı kapatan oyuncu
kaldığı adıma döner, başka bir hesaba giren görmez.

## Döngü

1. **Lobi** (Oyna sekmesi), telefonun kilit ekranı gibi çizilir — Quezby,
   telefon alışkanlığının oyunu: saatin yerinde sezon rekorun, altında
   sıraların; bekleyen her şey aynı boyda bir bildirim: arkadaşının VS'i
   (✓ oynar, ✗ reddeder), bugünün **Günün akışı** (küçük bir **Oyna** ile),
   ligdeki yerin, bu hafta hemen üstündeki rakip. Günün akışı oynanmasa da
   lobi boş durmaz. Dock'un üstündeki tek altın düğme — "Yukarı kaydır, oyna",
   dokunmak da yeter — "Mod seç" penceresini açar: **Günlük · Normal ·
   Dereceli** (bkz. *Modlar*).
2. **Oyna** → sunucudan seed'li bir tur açılır (`POST /runs`, `free`, `daily`,
   `rated` ya da bir arkadaşla `vs`).
3. 3-2-1, sonra reeller: kaydır, çift dokun, basılı tut, dokunma.
4. Her 20 reelde seviye (puan çarpanı) artar, pencere daralır, bar hızlanır;
   hatasız seriler kombo çarpanını x1,50'ye taşır, isimli kombolar patlar.
5. Tur bitince hareket kaydı sunucuya gider; sunucu tekrar oynatır, skoru
   doğrular ve istatistiklere yazar; Normal ve Günlük turu tablolara,
   dereceli turu yalnızca Elo'ya (`POST /runs/{id}/finish`).
6. Sonuç ekranı önce "Doğrulanıyor…" der, sonra **yalnızca sunucunun**
   sayılarını gösterir: skor, Elo (yeni reyting, ±değişim, hedef; yeni ligde
   konfeti), puanın nereden geldiği, sıra değişimi, bu hafta geçtiklerin,
   Dereceli'ye kalan oyun (açıldığı turda "Dereceli açıldı!" ve konfeti),
   günlükse paylaşım kartı. Dereceli turun kendi töreni vardır: skorun
   yerine oyuncu, liginin çerçevesi içinde; Elo eski yerinden yenisine sayar,
   değişim büyük yeşil ya da kırmızı bir levhada ("+42"), ligin barı onunla
   akar ("Platin'e 158 qb"), altında "Skor … · Hedef …", "Hedefi geçtin" ya da
   "Hedefin altında". Zorluk ve sıradaki hedef yazılmaz. Yeni ligde bar dolar, eski çerçeve
   parlayıp gider, yenisi dönen ışınların önüne iner, "YÜKSELDİN!", konfeti ve
   titreşim; düşüşte kırmızı "DÜŞTÜN" ve sarsıntı; yerleşen turda ilk çerçeve
   açılır ("YERLEŞTİN!"). Dereceli turda sıra, rekor ve "geçtiklerin" yoktur. Bir VS turunda sıra ve
   paylaşım yoktur; VS'in kendisi vardır: gönderildi, ya da kazandın,
   kaybettin, berabere.

Tur süresi yeni başlayanda ~2, ortalama oyuncuda ~3,5, iyi oyuncuda 5–6,
profesyonelde ~7,5 dakikadır. Aynı yetenek aynı sürede ±%20 aynı skoru yapar.
Ayrıntılar: [scoring.md](./scoring.md).

## Modlar

CS2'nin rekabetçi modu gibi: önce oyunu öğren, sonra dereceli oyna.

- **Günlük** (`daily`): Günün akışı, aşağıda.
- **Normal** (`free`): istediğin kadar oyna; skor Zirve'ye yazılır.
- **Dereceli** (`rated`): Elo için oynanır. **20 sayılan Normal ya da Günlük
  turdan sonra açılır** (`QUEZBY_LEAGUE_UNLOCK_RUNS`; deneme turu ve VS
  sayılmaz). Kilitliyken "Mod seç"te Dereceli kilitli ve soluk durur,
  "Dereceli'ye 12 oyun kaldı" ve bir ilerleme çubuğuyla; lobideki lig kartı ve
  Lig ekranı da ilerlemeyi gösterir.
  İlk **3 dereceli tur yerleşmedir**, sonra her dereceli tur Elo'yu değiştirir.
  Bir kez dereceli oynayan için hep açıktır.
  **Elo arttıkça Dereceli zorlaşır:** 1000 Elo'dan itibaren her 250 Elo'da bir
  zorluk (0–16): engeller sıklaşır, "Dokunma" reeli artar, hatalar daha çok
  dopamin götürür ve bar daha hızlı erir. Bronz ve yerleşme turları oyunu
  olduğu gibi oynar. Ayrıntılar: [scoring.md → Dereceli zorluğu](./scoring.md#dereceli-zorluğu).

Hafta / Ay / Tüm zamanlar tablolarına (Zirve) **yalnız Normal ve Günlük**
turlar yazılır. Dereceli yalnızca Elo için oynanır: Elo'yu ve lig sıralamasını
yalnız o besler, hiçbir skor tablosuna yazılmaz.

## Her gün

- **Günün akışı:** her İstanbul günü herkes aynı reel dizisini oynar, **tek
  hak** (başlatınca kullanılır). Kendi tablosu vardır (`challenge`) ve normal
  tablolara da sayılır; Elo'ya sayılmaz. Sonucu Wordle gibi paylaşılır:
  `Quezby · Günün akışı #17 · 🟩🟩🟨🟥⬛ · 52.340 puan · #37/1.204` — kare
  başına bir seviye (🟩 hatasız, 🟨 bir-iki hata, 🟥 daha fazla, ⬛ bittiği yer).
  Metni sunucu yazar.
- **Lig = Elo:** Bronz · Gümüş · Altın · Platin · Elmas · **MasterClass**, her
  biri 1000 Elo (MasterClass 5000 ve üstü). Lig bir **profil çerçevesidir**
  ve herkese açıktır: oyuncunun portresi liginin çerçevesinde durur. Lobide,
  lig ekranında, profilde, her ekrandan açılan oyuncu kartında, arkadaş
  listesinde, aramada ve "Mod seç"in Dereceli kutusunda. Zirve'den açılan
  kartta da çerçeve görünür, lig adı ve Elo görünmez. Çerçeve lig
  yükseldikçe süslenir: sade Bronz, küçük kanatlı Gümüş, büyüyen kanatlar,
  Platin'in sivri tepesi, Elmas'ın tacı, MasterClass'ın taç, hale ve ışınları;
  lig ekranında ve sonuçta parlar, ışıldar. Her dereceli turun bir **hedef
  skoru** var: geçen Elo kazanır, altında kalan kaybeder, bir tur en fazla ±100.
  İlk 3 dereceli tur yerleşmedir, herkes Gümüş'te başlar. Hedef ve zorluk
  oyuncuya gösterilmez (aşağıda). Yarım bırakılan dereceli tur hükmen
  kayıptır.
- **Oyuncu Elo'yu "qb" diye görür** (2026-09-30): her dilde "2.340 qb",
  "Altın'a 158 qb"; sistem altta Elo'dur. qb'nin logosu bir **para**dır
  (`QbCoin`): altın, boncuklu bir kenar, markanın magentadan menekşeye yüzü ve
  üstünde kabartma altın "qb" monogramı (q, b'nin yarım tur dönmüşü). Etiketler
  aynı çizimin tek renklisini (`qb` ikonu) kullanır.
- **Dereceli ekranları zorluğu ve hedefi söylemez** (2026-09-30): Lig
  ekranında, lobideki lig kartında, "Mod seç"in Dereceli kutusunda ve HUD'da
  zorluk ve hedef rozeti, "Bu skoru geçersen…" gibi açıklamalar yoktur; lig
  ekranı ve kart yalnız **En yüksek**'i (ve varsa kalkanı) gösterir, HUD
  "Dereceli" der. Hedef yalnız girişte görünür: "Mod seç"in Dereceli kutusu
  sıradaki turun en az kaç puan yapması gerektiğini söyler ("En az 81.700
  puan"; hedef yokken "qb için oyna"). Lig ekranında barın altında "Platin'e
  … qb" satırı, lig sıralamasının altında kural satırı yoktur. Oyun yine
  zorlaşır; kurallar "?" yardımında yazar. Sonuç ekranı turun skorunu hedefle yan yana gösterir
  ("Skor … · Hedef …", "Hedefi geçtin"), sıradakini söylemez.
- **qb hareketleri:** Lig ekranının sağ üst köşesindeki qb parası, qb'nin
  hareketlerini bir sayfada açar: üstte bugünkü qb, altında en yeniden eskiye
  her hareket (tur, yerleşme, hükmen, geri alındı, **Düzeltme**), ne zaman,
  turun skoru ve hedefi, yeşil ya da kırmızı değişim ve bıraktığı qb. Lig
  ekranında ayrıca liste yoktur. **Düzeltme**, sahibin (owner) panelden
  oyuncunun qb'sini elle değiştirmesidir; denetim günlüğüne yazılır
  ([admin-api.md](../backend/admin-api.md)).
  Ayrıntılar: [scoring.md → Elo](./scoring.md#elo).
- **Lig sıralaması hiç sıfırlanmaz:** satrançtaki gibi ligin Elo'nun
  kademesidir; Lig ekranı ligindeki oyuncuları (son 14 günde dereceli
  oynamış) Elo'ya göre sıralar, senin satırın altta, üsttekine kalan Elo'yla
  ("@deniz'e 40 Elo", **Geç onu** dereceli oynatır). Haftalık grup, hafta
  kapanışı ve Elo bonusu yoktur. Yerleşmeden önce Lig ekranı "Lig sıralaması
  Dereceli oyuncularının" der.

## Rekabet

- Sıralamalar: **Bu hafta**, **Bu ay**, **Tüm zamanlar** (Europe/Istanbul) ve
  **Günün akışı**; hepsine yalnız Normal ve Günlük turlar yazılır. Günlük
  tablo yoktur. Her oyuncunun o dönemdeki en iyi turu tek satır; eşitlikte
  önce yapan önde. Tüm zamanlar sezonun (kural sürümünün) tüm zamanlarıdır.
- **Zirve** tasarımı: tepede podyum (taç, madalyalar), altında tırmanış —
  her satır bir üsttekini geçmek için gereken puanı gösterir — ve altta sabit
  **"Senin katın"**: sıran, bir üst sıraya ilerleme çubuğu, "@ekin'e 1.240 puan"
  ve **Geç onu**. Dönemin bitmesine geri sayım sunucu saatine göredir.
- **Zirve'de Elo yoktur:** yalnız üç skor tablosu. Elo sıralaması Lig
  ekranındadır; Zirve'den açılan oyuncu kartı da lig ve Elo göstermez.
- Her tabloda "Herkes | Arkadaşlar" (arkadaşların + sen). Bir satıra dokununca
  oyuncu kartı açılır.
- Skor istemciden asla kabul edilmez; sunucu aynı motoru PHP'de çalıştırır.
  Şüpheli turlar tabloya girmez; zirveye yakın şüpheli skorlar incelemeye düşer.

## Arkadaşlar

Dock'taki **Mesajlar** sekmesi iki taraflıdır (üstte bir anahtar; rozeti
bakılmayı bekleyen sohbetleri ve istekleri sayar): **Mesajlar** — arkadaş
başına bir sohbet, sesi en son gelen üstte; **Arkadaşlar** — adla arama,
cevap bekleyen istekler ve arkadaşların A'dan Z'ye. Profil'deki **Arkadaş**
sayısı bu tarafı açar. Lobideki **zil** **Bildirimler**'i açar: gelen
istekler (orada kabul edilir ya da reddedilir), kabul edilen isteğin, gelen
VS (orada oynanır ya da reddedilir) ve gönderdiğin VS'lerin sonu — kazandın,
kaybettin, berabere, reddedildi, süresi doldu. Zilin rozeti görülmemişleri
sayar; liste açılınca sıfırlanır. Hazır mesajlar Bildirimler'e düşmez. Bir oyuncunun kartında arkadaş sayısı herkese
görünür; listesi yalnızca kendisine ve arkadaşlarına açılır (başkasına "Bu
liste kilitli"). Sırası sende olan VS'ler lobide de bildirim olarak durur.
Sözleşme: [api-contract.md](../backend/api-contract.md) (*Players and
friends*, *Inbox*, *VS*, *Push*).

- **Arkadaşlık iki evetle olur.** **Arkadaş bul** (adın ilk harfleriyle arama)
  ya da oyuncu kartındaki **Ekle** istek gönderir; öteki **Kabul et** ya da
  **Reddet** der. İki taraf birbirini eklerse arkadaş olurlar. İstek geri
  alınır, arkadaşlık bitirilir. En fazla 500 arkadaş ve cevap bekleyen en fazla
  100 istek. Takip sisteminden gelen karşılıklı takipler arkadaşlığa, tek
  yönlüler bekleyen isteğe dönüştü.
- **Sohbet yazıyla değil, hazır mesajlarla olur:** 24 sabit söz — önce
  selamlar ("Selam! 👋", "Naber? 😄"), sonra oyun dünyasının şakaları ("GG WP
  🤝", "EZ 😎", "Lag vardı! 📶", "Rage quit attım! 😡"…); sohbetin altındaki
  **Hazır mesaj gönder** hepsini bir sheet'te açar, birine dokununca gider.
  Telefon kendi dilinde gösterir. Oyuncudan oyuncuya
  yazılmış hiçbir söz gitmez; bu yüzden denetlenecek metin de yoktur. Bir
  arkadaşa günde en fazla 20. Sohbete oyunun kendi satırları da düşer:
  "artık arkadaşsınız", VS daveti, sonucu, reddi, süresinin dolması. Satırlar
  90 gün tutulur; arkadaşlık bitince sohbet silinir.
- **VS:** iki arkadaş, aynı akış, birer hak. Gönderen önce oynar; skoru,
  arkadaşı oynayana kadar ondan gizlidir. Temiz olmayan tur VS'i hiç
  göndermez. Arkadaşın 48 saat içinde oynar ya da reddeder; süre dolarsa VS
  kimseye sayılmaz. Yüksek temiz skor kazanır, eşitlik beraberliktir;
  arkadaşın turu temiz değilse ya da yarım kalırsa kaybeder. İki arkadaş
  arasında aynı anda tek açık VS olur. VS hiçbir tabloya, lige, istatistiğe
  ya da rekora yazılmaz, paylaşım metni yoktur. Cron yok: VS, ikisinden biri
  baktığında kapanır. Sohbet, iki arkadaşın VS karnesini (galibiyet,
  mağlubiyet, beraberlik) gösterir.
- **Engelle:** arkadaşlığı, istekleri, sohbeti ve açık VS'i bitirir.
  Engellenen oyuncuya söylenmez: engelleyeni bulamaz, ekleyemez, ona yazamaz,
  VS atamaz. **Ayarlar → Engellenenler**'den kaldırılır.
- **Bildir:** oyuncu kartından bir oyuncunun fotoğrafı ya da adı moderatöre
  bildirilir; kimin bildirdiği söylenmez. Moderatör yönetim panelinde
  fotoğrafı kaldırır, adı sıfırlar ya da bildirimi kapatır
  ([admin-api.md](../backend/admin-api.md) → *Reports*).
- **Bildirimler (push):** gelen istek, kabul edilen istek, gelen VS, biten VS
  ve hazır mesaj telefona alıcının dilinde gelir; aynı arkadaştan hazır mesaj
  5 dakikada en fazla bir kez. Reddedilen ya da süresi dolan VS yalnızca mesaj
  kutusuna düşer. Oyun açıkken bildirim üstte kısa bir şerit olur. Dokununca
  istek Bildirimler'i, gerisi o arkadaşın sohbetini açar. Bildirimler
  kapalıysa Mesajlar sekmesi, sohbet ve az önce gönderilen VS bir kartla
  **Bildirimleri aç** der; telefon artık sormuyorsa düğme **Ayarları aç** olur
  ve telefonun ayarlarını açar (sekmedeki ve sohbetteki kart bir haftalığına
  gizlenebilir). Türler **Ayarlar → Bildirimler**'den ayrı ayrı kapatılır.
  Kurulum: [push-setup.md](../development/push-setup.md).

## Hesap

- Hesap deneme turundan sonra açılır: Apple, Google, e-posta ya da misafir
  (*İlk açılış*). Her hesap açıldığı anda bir ad alır — oyuncu seçene kadar
  `guest48128742`; seçtiği ad bir daha değişmez ([usernames.md](./usernames.md)).
- **Oturum:** telefonun güvenli deposunda (iOS keychain, Android Keystore)
  yalnızca token durur, onu açan kurulumun kimliğiyle; yedeğe girmez. Kurulum
  kimliği AsyncStorage'dadır ve uygulamayla silinir. iOS'ta keychain uygulama
  silinince kalır, bu yüzden kimliği olmayan yeni bir kurulum ilk açılışta
  keychain'i temizler ve başka bir kurulumun token'ını hiç kullanmaz: uygulamayı
  silip yeniden kuran oyuncu çıkış yapmış olarak başlar. Misafir hesabın tek
  anahtarı token'dır; misafir uygulamayı silerse hesabını da kaybeder.
- Misafir kalan oyuncuya, ligi açıldığı ilk an lobide **bir kez** "Hesabını
  koru" sorulur: kaybedecek bir şeyi olduğu an. Sonrası yalnızca Profil'de ve
  **Hesap bilgileri**'ndedir.
- **Hesabını koru:** misafir hesaba Apple, Google ya da e-posta + şifre
  (iki kez) bağlanır; e-posta, ona giden 6 haneli kod girilince bağlanır.
  Turlar hesapla kalır. Başka cihazdan girilebilir. Hesaplar e-postaya
  göre asla birleştirilmez. Korunan hesapta aynı yer **Giriş yolları** olur:
  eksik yol eklenir, Apple ya da Google bağı kaldırılabilir — sunucu son giriş
  yolunun kaldırılmasına izin vermez.
- **Hesabı sil:** uygulama içinden, kalıcı (App Store 5.1.1(v)); Apple ile
  bağlıysa Apple'daki izin de geri alınır. Arkadaşlıklar, sohbetler, VS'ler ve
  profil fotoğrafı da hesapla gider.
- **Profil fotoğrafı:** Profil'deki portrenin kamera düğmesiyle galeriden bir
  fotoğraf seçilir ve kareye yerleştirilir; telefon 512 px'lik, en çok
  100 KB'lık bir JPEG gönderir. Sunucu onu yeniden kaydeder: konumu dahil
  fotoğrafın bütün meta verisi silinir. Fotoğraf kaldırılabilir; her oyuncu
  satırında, kartta ve podyumda görünür.
- **Geçmiş oyunlar:** Profil'den, oynanan her tur sunucunun saydığıyla —
  sıralı, bekleyen, bayraklı ya da VS; yalnızca Günün akışı ya da yalnızca
  VS'ler süzülebilir.
- **Profil** sadedir: portre, ad, lig ve Elo; altında **Rekor · Arkadaş · Tur**
  sayaçları ve sıraların; dört sayılık **İstatistikler** kutusu (hepsi ve
  isimli kombolar, en çok beğenilen postlar bir sayfada açılır) ve Geçmiş
  oyunlar.
- **Hesap bilgileri** (Ayarlar'da, **Çıkış yap**'ın hemen üstünde):
  kullanıcı adı (otomatik adla **Adını seç**, seçilmişse kilitli), bağlı
  hesaplar (Apple, Google, e-posta; ekle ya da bağı kaldır) ve en altta
  **Hesabı sil**.
- Ayarlar: **dil** ve titreşim (ikisi de telefonda saklanır, hesaba da
  yazılır). Dil, hesabın kaydıdır: başka bir telefonda o hesaba giren oyunu
  hesabın dilinde bulur ([localization.md](./localization.md)). Ayrıca
  **Bildirimler** (üç tür: arkadaşlık, VS, hazır mesajlar — hesaba yazılır) ve
  **Engellenenler**. Yardım: lobideki `?` ve Profil'den.

## İstatistik

Her şey sunucunun tekrar oynatmasından sayılır: kaydırılan reel, beğeni, altın,
mükemmel, dokunmadan geçilen, yakalanma, türe göre hatalar, tepki süreleri,
kombolar. Oyuncunun ömür boyu sayıları (`GET /me/stats`) ve akışın her
gönderisinin kaç kez gösterildiği/beğenildiği (`content_stats`) tutulur.
Yalnızca sıralı turlar sayılır; VS turları asla.

Oyunun nasıl kullanıldığı — ziyaretler, ekranlar, geri dönüş, ilk adımlar —
yalnızca izin veren oyuncular için ve şişmeyen katmanlarda tutulur; telefonun
modeli, sistemi ve uygulama sürümü ise herkes için, cihaz kaydında:
[analytics.md](./analytics.md). Karar **Ayarlar → Kullanım verisi**'nden
değişir; hayır diyenin kayıtları silinir.

## İçerik

Gerçek video ya da fotoğraf yok: her post, uygulamanın kendisinin çizdiği
sahte bir gönderi. Türü renginden okunur (gri sıradan, pembe arkadaş, altın,
kırmızı); postu özgün yapan **formatıdır**: sohbet ekran görüntüsü, anket,
grafik, market fişi, büyük sayı, tier list, kilit ekranı bildirimleri, alıntı
kartı, sahne (emojinin fotoğrafı), polaroid, foto dump, hazine, uyarı levhası,
güvenlik kamerası. Her tür yalnızca kendine uyan formatları giyer
(`FORMATS_OF`).

- **Katalog** (`packages/config/src/content/`): 1.000 post — 560 sıradan, 200
  arkadaş, 120 altın, 120 kırmızı; her biri bir espri, bir hesap ve bir
  format, altı dilde. İlk postlar formatlara göre (`posts/*.ts`), sonrakiler
  on iki temada (`posts/themes/`: ev, yemek, okul, iş, aile, arkadaşlar,
  telefon, doğa, hayvanlar, hobiler, seyahat, uyku) yazıldı; 100 reellik bir
  koşuda aynı post ortalama 5 kez tekrar eder, o da başka bir kıyafetle.
  Yalnızca sona eklenir: bir postun id'si türü ve
  listedeki yeridir (`like-007`), fixture'lar her id'nin emojisini ve
  formatını tutar. Oyun staging'deyken katalog sürüm 1'de yerinde büyür;
  mağazadaki oyuncular olunca liste uzunluğunu değiştiren her ekleme yeni
  sürümdür.
- **Giydirme** (`apps/mobile/src/game/dress.ts`): aynı post her koşuda başka
  görünür — arka plan deseni, formatın düzeni, eğim, çıkartma ve formatın
  ödünç aldığı parçalar (fişin öbür kalemleri, kilit ekranının öbür
  bildirimleri, anketin oranları, grafiğin çizgisi; havuzları
  `content/pools.ts`). Hepsi seed + reel sırasından seçilir: bir koşu hep aynı
  görünür, Günün akışı herkese aynıdır.
- Gönderi seed + reel sırasından seçilir; sunucu aynı seçimi yapar
  (`app/Content`), böylece hangi gönderinin beğenildiğini uygulamaya sormadan
  bilir. Görünüş sunucuya hiç gitmez.

Telif, moderasyon, bant genişliği ve yükleme gecikmesi derdi yoktur: post ilk
karesinde tam çizilmiştir ve internetsiz de aynı görünür.

## Sonraki adımlar

- Ses ve müzik (titreşim var).
- Oyunun kendi bildirimleri ("seni geçtiler", akşam hatırlatması) — push
  altyapısı arkadaşlık için kuruldu.
- Kural değişimleri ("Algoritma güncellendi!"), sahte altın reel, aşağı
  kaydırma ve paylaşma hareketleri — her biri yeni bir sezon.
- Şifre sıfırlama e-postası.
