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
for Games_ rehberi ve Unity'nin "önce anonim hesap, sonra bağla" yaklaşımı).
Oyun **telefonun dilinde** açılır — Türkçe, İngilizce, Almanca, Arapça,
Fransızca ya da İspanyolca; telefonun dili bunlardan biri değilse İngilizce.
Karşılamadaki küçük dil düğmesi daha oynamadan başka dil seçtirir
([localization.md](./localization.md)).

1. **Karşılama:** marka, dört hareketin taşları, tek altın **Oyna** ve
   **Hesabım var, giriş yap**. Oyna misafir hesabı açar; hesap açılırken
   sunucu ona `guest48128742` gibi bir ad verir. Bu iki düğmeden önce bir kez
   **"Oyunu birlikte geliştirelim mi?"** sorulur (**İzin ver / İzin verme**):
   cevap gelmeden hiçbir kullanım verisi sayılmaz
   ([analytics.md](./analytics.md)).
2. **Deneme turu:** gerçek kurallarla bir tur, ama tamamen telefonda —
   sunucuya hiç gitmez, **hiçbir yere sayılmaz** (tablo, lig, istatistik,
   rekor). Her hareketin ilk postundan önce akış durur ve bir koç kartı onu
   anlatır; postun süresi "Anladım"dan sonra başlar. Sonuç "DENEME TURU"
   etiketlidir; turun bitmeden göremediği hareketler orada anlatılır.
3. **Takma ad:** "Sana ne diyelim?" — seçilebilir ya da **Şimdilik geç**
   denir; geçen oyuncu otomatik adla oynar, adını sonra Profil'den seçer.
   Seçilen ad kalıcıdır, bir daha değişmez.
4. **Bildirimler:** "Haberin olsun mu?" — biri seni eklediğinde, bir
   arkadaşın VS attığında ya da mesaj gönderdiğinde. **Bildirimleri aç**
   telefonun kendi sorusunu getirir; **Şimdi değil** sonraya bırakır. Adım
   yalnızca soru hâlâ sorulabiliyorsa görünür: bildirimler zaten açıksa,
   telefon artık sormuyorsa ya da sürümde push yoksa atlanır.
5. **Hesabını koru:** Apple, Google ya da e-posta — ya da **Şimdi değil**.
   Apple/Google ile yeni açılan hesap bu adımı görmez.

İlk adımlar hesaba bağlıdır ve telefonda saklanır: uygulamayı kapatan oyuncu
kaldığı adıma döner, başka bir hesaba giren görmez. **Hesabım var** ile var olan
hesabına giren doğrudan lobiye geçer.

## Döngü

1. **Lobi** (Oyna sekmesi), telefonun kilit ekranı gibi çizilir — Quezby,
   telefon alışkanlığının oyunu: saatin yerinde sezon rekorun, altında
   sıraların; bekleyen her şey aynı boyda bir bildirim: arkadaşının VS'i
   (✓ oynar, ✗ reddeder), bugünün **Günün akışı** (küçük bir **Oyna** ile),
   ligdeki yerin, bu hafta hemen üstündeki rakip. Günün akışı oynanmasa da
   lobi boş durmaz. Dock'un üstündeki tek altın düğme — "Yukarı kaydır, oyna",
   dokunmak da yeter — serbest bir tur başlatır.
2. **Oyna** → sunucudan seed'li bir tur açılır (`POST /runs`, `free`, `daily`
   ya da bir arkadaşla `vs`).
3. 3-2-1, sonra reeller: kaydır, çift dokun, basılı tut, dokunma.
4. Her 20 reelde seviye (puan çarpanı) artar, pencere daralır, bar hızlanır;
   hatasız seriler kombo çarpanını x1,50'ye taşır, isimli kombolar patlar.
5. Tur bitince hareket kaydı sunucuya gider; sunucu tekrar oynatır, skoru
   doğrular, tablolara, lige ve istatistiklere yazar (`POST /runs/{id}/finish`).
6. Sonuç ekranı önce "Doğrulanıyor…" der, sonra **yalnızca sunucunun**
   sayılarını gösterir: skor, puanın nereden geldiği, sıra değişimi, bu hafta
   geçtiklerin, lig durumun, günlükse paylaşım kartı. Bir VS turunda sıra ve
   paylaşım yoktur; VS'in kendisi vardır: gönderildi, ya da kazandın,
   kaybettin, berabere.

Tur süresi yeni başlayanda ~2, ortalama oyuncuda ~3,5, iyi oyuncuda 5–6,
profesyonelde ~7,5 dakikadır. Aynı yetenek aynı sürede ±%20 aynı skoru yapar.
Ayrıntılar: [scoring.md](./scoring.md).

## Her gün

- **Günün akışı:** her İstanbul günü herkes aynı reel dizisini oynar, **tek
  hak** (başlatınca kullanılır). Kendi tablosu vardır (`challenge`) ve normal
  tablolara, lige de sayılır. Sonucu Wordle gibi paylaşılır:
  `Quezby · Günün akışı #17 · 🟩🟩🟨🟥⬛ · 52.340 puan · #37/1.204` — kare
  başına bir seviye (🟩 hatasız, 🟨 bir-iki hata, 🟥 daha fazla, ⬛ bittiği yer).
  Metni sunucu yazar.
- **Haftalık ligler:** Bronz · Gümüş · Altın · Platin · Elmas. Lig, oyuncunun
  **ilk 20 sayılan turundan** (sıralı ve puan almış; deneme turu ve VS
  sayılmaz; `QUEZBY_LEAGUE_UNLOCK_RUNS`) sonra açılır — birkaç tur oynayıp
  bırakanlar grupları doldurmaz; lobi ve Lig sekmesi "Lige 12 oyun kaldı"
  der. Bir kez lige girmiş oyuncu için hep açıktır.
  Sonra haftanın ilk sıralı turunda benzer kademedeki en fazla 30 kişilik bir
  gruba oturursun.
  **Lig puanı, haftanın her gününün en iyi skorlarının toplamıdır** — her gün
  bir tur, bir akşamda kasmaktan değerlidir. Hafta bitince ilk 5 bir üst lige
  çıkar, son 5 düşer (küçük gruplarda orantılı; Bronz'dan aşağı, Elmas'tan
  yukarı yok). Cron yok: geçen hafta, oyuncu yeniden oynadığında kapanır.

## Rekabet

- Sıralamalar: **Bu hafta**, **Bu ay**, **Tüm zamanlar** (Europe/Istanbul) ve
  **Günün akışı**. Günlük tablo yoktur: günün en iyi skoru yalnızca lig puanı
  için tutulur. Her oyuncunun o dönemdeki en iyi turu tek satır; eşitlikte
  önce yapan önde. Tüm zamanlar sezonun (kural sürümünün) tüm zamanlarıdır.
- **Zirve** tasarımı: tepede podyum (taç, madalyalar), altında tırmanış —
  her satır bir üsttekini geçmek için gereken puanı gösterir — ve altta sabit
  **"Senin katın"**: sıran, bir üst sıraya ilerleme çubuğu, "@ekin'e 1.240 puan"
  ve **Geç onu**. Dönemin bitmesine geri sayım sunucu saatine göredir.
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
- **Sohbet yazıyla değil, hazır mesajlarla olur:** on sabit söz ("İyi oyundu!
  👏", "Rövanş? 🔥"…); telefon kendi dilinde gösterir. Oyuncudan oyuncuya
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

- Yeni oyuncu **Oyna** ile misafir başlar; var olan hesaba **Hesabım var, giriş
  yap** (Apple, Google ya da e-posta) ile girilir. Misafir token'ı keychain'de
  tutulur (iOS'ta uygulama silinse bile kalır). Her hesap açıldığı anda bir ad
  alır — oyuncu seçene kadar `guest48128742`; seçtiği ad bir daha değişmez
  ([usernames.md](./usernames.md)).
- Misafir kalan oyuncuya, ligi açıldığı ilk an lobide **bir kez** "Hesabını
  koru" sorulur: kaybedecek bir şeyi olduğu an. Sonrası yalnızca Profil'de ve
  **Hesap bilgileri**'ndedir.
- **Hesabını koru:** misafir hesaba Apple, Google ya da e-posta + şifre
  bağlanır; turlar hesapla kalır. Başka cihazdan girilebilir. Hesaplar e-postaya
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
- **Profil** sadedir: portre, ad, lig; altında **Rekor · Arkadaş · Tur**
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
