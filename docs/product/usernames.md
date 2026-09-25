# Kullanıcı adları

**Kod:** `packages/config/src/username.ts` (uygulama) · `apps/api/app/Support/Username.php` (API)
**Ortak testler:** `packages/config/fixtures/usernames.json` — iki taraf da aynı dosyaya karşı test edilir.

Sıralamada herkes birbirini kullanıcı adıyla görür; ad **benzersizdir** ve her
hesabın ilk andan bir adı vardır.

## Otomatik ad

Hesap açılırken (misafir ya da Apple/Google ile yeni hesap) sunucu ona
`guest` + 8 rakam bir ad verir: `guest48128742` (`App\Services\Identity\GuestNames`,
100 milyon ihtimal; alınmışsa yeniden çekilir, aynı anda çakışmayı unique index
çözer). Oyuncu deneme turundan sonra "Sana ne diyelim?" adımında bir ad seçer
ya da **Şimdilik geç** der ve bu adla oynar. Adlar küçük harfle saklandığı için
`Guest48128742` değil `guest48128742` görünür.

- `isAutoUsername` (TS) / `Username::isAutomatic` (PHP): ad hâlâ otomatik mi.
  Profil'de satır "Adını seç" der ve form boş açılır.
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
- Uygulama kuralları yazarken canlı gösterir (`usernameChecklist`), iyi biçimli
  bir adı 350 ms bekleyip `GET /usernames/check` ile sorar.

## Neden Türkçe karakter yok?

`İ` / `ı` harfleri dile göre farklı küçülür (`I` → `ı` mı `i` mi?) ve `şule` ile
`sule` iki ayrı kişi olursa sıralamada kimse kimseyi bulamaz. Instagram ve
TikTok da aynı sebeple yalnızca ASCII harf kabul eder. Oyuncuya "ş yerine s"
diyen ayrı bir mesaj gösterilir.

## Değiştirmek

Profil → Ayarlar → *Kullanıcı adını değiştir* (ad hâlâ otomatikse *Adını seç*).
Aynı kurallar ve aynı kontrol; eski skorlar yeni adla görünür (skorlar
kullanıcıya bağlıdır, ada değil). Oyuncunun kendi adı — otomatik olan da —
"ayrılmış" sayılmaz, "şu anki adın" olarak gösterilir.

Listeyi genişletirken (`RESERVED_USERNAMES`, `BLOCKED_FRAGMENTS`, otomatik ad
kalıbı) PHP tarafını ve fixture dosyasını (`valid`, `invalid`, `automatic`) aynı
değişiklikte güncelleyin.
