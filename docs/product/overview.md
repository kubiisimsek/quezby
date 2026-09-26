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
for Games_ rehberi ve Unity'nin "önce anonim hesap, sonra bağla" yaklaşımı):

1. **Karşılama:** marka, dört hareketin taşları, tek altın **Oyna** ve
   **Hesabım var, giriş yap**. Oyna misafir hesabı açar; hesap açılırken
   sunucu ona `guest48128742` gibi bir ad verir.
2. **Deneme turu:** gerçek kurallarla bir tur, ama tamamen telefonda —
   sunucuya hiç gitmez, **hiçbir yere sayılmaz** (tablo, lig, istatistik,
   rekor). Her hareketin ilk postundan önce akış durur ve bir koç kartı onu
   anlatır; postun süresi "Anladım"dan sonra başlar. Sonuç "DENEME TURU"
   etiketlidir; turun bitmeden göremediği hareketler orada anlatılır.
3. **Takma ad:** "Sana ne diyelim?" — seçilebilir ya da **Şimdilik geç**
   denir; geçen oyuncu otomatik adla oynar, adını sonra Profil'den seçer.
   Seçilen ad kalıcıdır, bir daha değişmez.
4. **Hesabını koru:** Apple, Google ya da e-posta — ya da **Şimdi değil**.
   Apple/Google ile yeni açılan hesap bu adımı görmez.

İlk adımlar hesaba bağlıdır ve telefonda saklanır: uygulamayı kapatan oyuncu
kaldığı adıma döner, başka bir hesaba giren görmez. **Hesabım var** ile var olan
hesabına giren doğrudan lobiye geçer.

## Döngü

1. **Lobi** (Oyna sekmesi): bugünün **Günün akışı**, ligdeki yerin, hemen
   üstündeki rakip ve rekorların. Tek büyük düğme bugünün turunu başlatır.
2. **Oyna** → sunucudan seed'li bir tur açılır (`POST /runs`, `free` ya da `daily`).
3. 3-2-1, sonra reeller: kaydır, çift dokun, basılı tut, dokunma.
4. Her 20 reelde seviye (puan çarpanı) artar, pencere daralır, bar hızlanır;
   hatasız seriler kombo çarpanını x1,50'ye taşır, isimli kombolar patlar.
5. Tur bitince hareket kaydı sunucuya gider; sunucu tekrar oynatır, skoru
   doğrular, tablolara, lige ve istatistiklere yazar (`POST /runs/{id}/finish`).
6. Sonuç ekranı önce "Doğrulanıyor…" der, sonra **yalnızca sunucunun**
   sayılarını gösterir: skor, puanın nereden geldiği, sıra değişimi, bugün
   geçtiklerin, lig durumun, günlükse paylaşım kartı.

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
  **ilk 3 sayılan turundan** (sıralı ve puan almış; deneme turu sayılmaz)
  sonra açılır — tek tur oynayıp bırakanlar grupları doldurmaz; lobi ve Lig
  sekmesi "Lige 2 oyun kaldı" der. Bir kez lige girmiş oyuncu için hep açıktır.
  Sonra haftanın ilk sıralı turunda benzer kademedeki en fazla 30 kişilik bir
  gruba oturursun.
  **Lig puanı, haftanın her gününün en iyi skorlarının toplamıdır** — her gün
  bir tur, bir akşamda kasmaktan değerlidir. Hafta bitince ilk 5 bir üst lige
  çıkar, son 5 düşer (küçük gruplarda orantılı; Bronz'dan aşağı, Elmas'tan
  yukarı yok). Cron yok: geçen hafta, oyuncu yeniden oynadığında kapanır.

## Rekabet

- Sıralamalar: **Bugün**, **Bu hafta**, **Bu ay**, **Tüm zamanlar**
  (Europe/Istanbul) ve **Günün akışı**. Her oyuncunun o dönemdeki en iyi turu
  tek satır; eşitlikte önce yapan önde. Tüm zamanlar sezonun (kural sürümünün)
  tüm zamanlarıdır.
- **Zirve** tasarımı: tepede podyum (taç, madalyalar), altında tırmanış —
  her satır bir üsttekini geçmek için gereken puanı gösterir — ve altta sabit
  **"Senin katın"**: sıran, bir üst sıraya ilerleme çubuğu, "@ekin'e 1.240 puan"
  ve **Geç onu**. Dönemin bitmesine geri sayım sunucu saatine göredir.
- **Arkadaşlar:** kullanıcı adıyla ara, takip et; her tabloda
  "Herkes | Arkadaşlar" (takip ettiklerin + sen). Bir satıra dokununca oyuncu
  kartı açılır. Takip sınırı 500.
- Skor istemciden asla kabul edilmez; sunucu aynı motoru PHP'de çalıştırır.
  Şüpheli turlar tabloya girmez; zirveye yakın şüpheli skorlar incelemeye düşer.

## Hesap

- Yeni oyuncu **Oyna** ile misafir başlar; var olan hesaba **Hesabım var, giriş
  yap** (Apple, Google ya da e-posta) ile girilir. Misafir token'ı keychain'de
  tutulur (iOS'ta uygulama silinse bile kalır). Her hesap açıldığı anda bir ad
  alır — oyuncu seçene kadar `guest48128742`; seçtiği ad bir daha değişmez
  ([usernames.md](./usernames.md)).
- Misafir kalan oyuncuya, ligi açıldığı ilk an lobide **bir kez** "Hesabını
  koru" sorulur: kaybedecek bir şeyi olduğu an. Sonrası yalnızca Profil'dedir.
- **Hesabını koru:** misafir hesaba Apple, Google ya da e-posta + şifre
  bağlanır; turlar hesapla kalır. Başka cihazdan girilebilir. Hesaplar e-postaya
  göre asla birleştirilmez. Korunan hesapta aynı yer **Giriş yolları** olur:
  eksik yol eklenir, Apple ya da Google bağı kaldırılabilir — sunucu son giriş
  yolunun kaldırılmasına izin vermez.
- **Hesabı sil:** uygulama içinden, kalıcı (App Store 5.1.1(v)); Apple ile
  bağlıysa Apple'daki izin de geri alınır.
- Ayarlar: titreşim (telefonda saklanır, hesaba da yazılır). Yardım: lobideki
  `?` ve Profil'den.

## İstatistik

Her şey sunucunun tekrar oynatmasından sayılır: kaydırılan reel, beğeni, altın,
mükemmel, dokunmadan geçilen, yakalanma, türe göre hatalar, tepki süreleri,
kombolar. Oyuncunun ömür boyu sayıları (`GET /me/stats`) ve akışın her
gönderisinin kaç kez gösterildiği/beğenildiği (`content_stats`) tutulur.
Yalnızca sıralı turlar sayılır.

## İçerik

Gerçek video yok. Her reel bir renk ve bir sahte gönderi: emoji, hesap adı,
espri — `packages/config/src/content/`, sürümlü ve yalnızca sona eklenen bir
katalog. Gönderi seed + reel sırasından seçilir; sunucu aynı seçimi yapar
(`app/Content`), böylece hangi gönderinin beğenildiğini uygulamaya sormadan
bilir. Telif, moderasyon ve bant genişliği derdi yoktur; oyun anında okunur.

## Sonraki adımlar

- Ses ve müzik (titreşim var).
- Push bildirimleri ("seni geçtiler", akşam hatırlatması).
- Kural değişimleri ("Algoritma güncellendi!"), sahte altın reel, aşağı
  kaydırma ve paylaşma hareketleri — her biri yeni bir sezon.
- Cihaz doğrulama (App Attest / Play Integrity) ile bot yazmayı daha da zorlaştırmak.
- Şifre sıfırlama e-postası.
