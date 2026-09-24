# Kullanıcı adları

**Kod:** `packages/config/src/username.ts` (uygulama) · `apps/api/app/Support/Username.php` (API)
**Ortak testler:** `packages/config/fixtures/usernames.json` — iki taraf da aynı dosyaya karşı test edilir.

Sıralamada herkes birbirini kullanıcı adıyla görür, bu yüzden ilk sıralı turdan
önce bir ad seçilir ve **benzersizdir**.

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
| Ayrılmış adlar kullanılamaz | `admin`, `destek`, `misafir`, içinde `quezby` geçen her ad |
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

Profil → *Kullanıcı adını değiştir*. Aynı kurallar ve aynı kontrol; eski
skorlar yeni adla görünür (skorlar kullanıcıya bağlıdır, ada değil).

Listeyi genişletirken (`RESERVED_USERNAMES`, `BLOCKED_FRAGMENTS`) PHP
tarafını ve fixture dosyasını aynı değişiklikte güncelleyin.
