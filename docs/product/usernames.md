# Kullanıcı adları

**Kod:** `packages/config/src/username.ts` (uygulama) · `apps/api/app/Support/Username.php` (API)
**Ortak testler:** `packages/config/fixtures/usernames.json` — iki taraf da aynı dosyaya karşı test edilir.

Sıralamada herkes birbirini kullanıcı adıyla görür; ad **benzersizdir**, her
hesabın ilk andan bir adı vardır ve oyuncunun seçtiği ad **kalıcıdır** — bir
kez seçilir, bir daha değişmez.

## Otomatik ad

Hesap açılırken (misafir, e-posta ya da Apple/Google ile yeni hesap) sunucu ona
`guest` + 8 rakam bir ad verir: `guest48128742` (`App\Services\Identity\GuestNames`,
100 milyon ihtimal; alınmışsa yeniden çekilir, aynı anda çakışmayı unique index
çözer). Apple, Google ya da e-postayla giren oyuncuya, hesabın adı hâlâ
otomatikse girişin hemen ardından "Sana ne diyelim?" sorulur; bir ad seçer ya da
**Şimdilik geç** der ve bu adla oynar. Misafire sorulmaz; adını Profil'den seçer. Adlar küçük harfle saklandığı için
`Guest48128742` değil `guest48128742` görünür.

- `isAutoUsername` (TS) / `Username::isAutomatic` (PHP): ad hâlâ otomatik mi.
- `canPickUsername` (TS) / `Username::isPickable` (PHP): oyuncu hâlâ ad seçebilir
  mi — yalnızca ad otomatikken ya da hiç yokken. Profil → Ayarlar → Hesap
  bilgileri'nde satır "Adını seç" der ve form boş açılır; seçildikten sonra
  aynı yerde kilitli, basılmayan bir satır durur: "Kullanıcı adın · @ekin ·
  kalıcı".
- **Otomatik görünen adlar ayrılmıştır:** sembolleri atılınca `guest` ya da
  `misafir` + yalnızca rakam kalan her ad (`guest12345678`, `Guest.4812`,
  `misafir*7`) `reserved` döner — seçilmiş bir ad verilmiş gibi görünmesin.
  `guest.kubi`, `guesthouse7` serbesttir.
- Otomatik adlardan önce açılmış, adı olmayan hesaplara ad dolgusu yapılmadı:
  onlara uygulama eskisi gibi atlanamayan ad sorusunu sorar.

## Kurallar

| Kural | Örnek hata |
| --- | --- |
| 3–20 karakter | `ab` |
| Sadece `a–z`, `0–9`, `.` ve `*` | `kubi_01`, `kubi-01`, `kubi 01` |
| Türkçe karakter yok (ayrı mesajla) | `şule`, `gökhan`, `İrmak` |
| Harf ya da rakamla başlar | `.kubi`, `*kubi` |
| Harf ya da rakamla biter | `kubi.`, `kubi*` |
| `.` ve `*` **art arda gelemez** (`..`, `**`, `.*`, `*.`) | `ku.*bi` |
| En az bir harf | `1234`, `1.2*3` |
| Ayrılmış adlar kullanılamaz | `admin`, `destek`, `misafir`, içinde `quezby` geçen her ad, `guest12345678` gibi otomatik görünen adlar |
| Küçük bir küfür listesi (semboller çıkarılarak) | `o.r.o.s.p.u` |

- Büyük/küçük harf fark etmez: `Kubi.01` → `kubi.01` olarak saklanır ve gösterilir.
- Benzersizlik veritabanında **unique index** ile garanti edilir; aynı ada aynı
  anda başvuran iki oyuncudan biri `409 username_taken` alır.
- Uygulama alanın altında yalnızca üç kuralı canlı gösterir: uzunluk, izinli
  karakterler ve en az bir harf (`usernameChecklist` kural kimliklerini verir;
  kelimeler oyuncunun dilinde `usernameRules` kataloğundan gelir). Baştaki,
  sondaki ya da art arda gelen `.` / `*` listede yazmaz; ad bunu yaptığında
  alan tek cümlelik hatasını o an söyler. İyi biçimli bir adı 350 ms bekleyip
  `GET /usernames/check` ile sorar. Sunucunun mesajları isteğin dilindedir
  (`lang/{dil}/username.php`).

## Neden Türkçe karakter yok?

`İ` / `ı` harfleri dile göre farklı küçülür (`I` → `ı` mı `i` mi?) ve `şule` ile
`sule` iki ayrı kişi olursa sıralamada kimse kimseyi bulamaz. Instagram ve
TikTok da aynı sebeple yalnızca ASCII harf kabul eder. Oyuncuya "ş yerine s"
diyen ayrı bir mesaj gösterilir — her dilde: Almanca, Fransızca ya da
İspanyolca yazan da `ü`, `ç` gibi harflerde aynı yardımı alır ("ü yerine u").
Arapça harfler de kabul edilmez; Arapça oynayan oyuncunun adı da Latin
harflerle yazılır ve kural bunu "yalnızca Latin harfler" diye söyler.

## Kalıcı ad

Ad **bir kez** seçilir: ilk açılıştaki "Sana ne diyelim?" adımında ya da sonra
Profil → Ayarlar → *Adını seç*'te. Seçilen ad bir daha değişmez; ekranlar bunu
kaydetmeden önce söyler ("seçtiğin ad bir daha değişmez"), onay adımı yoktur.

- `PUT /me/username` yalnızca ad otomatikken ya da yokken yeni bir ad yazar;
  seçilmiş bir adın üstüne gelen her ad `409 username_locked` döner ("Kullanıcı
  adını zaten seçtin; seçilen ad değişmez."). Aynı adı yeniden göndermek
  zararsızdır (200, hiçbir şey değişmez).
- Yazma, oyuncunun o anki adına **koşulludur** (compare-and-set): art arda iki
  hızlı istek ikisi birden yazılamaz; geç kalan `username_locked` alır. İki
  oyuncunun aynı ada yarışını unique index çözer (`username_taken`).
- Uygun olup olmadığına bakarken oyuncunun kendi adı "ayrılmış" sayılmaz,
  "şu anki adın" olarak gösterilir.
- Tek kaçış yolu moderasyon: panelde **Adı sıfırla** oyuncuya yeni bir otomatik
  ad verir (eski ad denetim kaydında kalır) ve bu, oyuncuya **bir** seçim daha
  açar; o ad da kalıcıdır.
- Kural devreye girdiği anda bugüne kadar seçilmiş bütün adlar kalıcı oldu.

Listeyi genişletirken (`RESERVED_USERNAMES`, `BLOCKED_FRAGMENTS`, otomatik ad
kalıbı) PHP tarafını ve fixture dosyasını (`valid`, `invalid`, `automatic`) aynı
değişiklikte güncelleyin.
