# Quezby — UI writing

The app speaks Turkish, informally (*sen*), in sentence case — with capitals
kept for the game's ribbons (see Rules).

## Two registers

| Where | Voice | Examples |
| --- | --- | --- |
| Inside a run | Short, cheeky, one or two words — read in a glance | "Takıldın!", "Yanlış hareket", "Erken bıraktın", "Yakalandın!", "Mükemmel!", "Dopamin bitti" |
| Around the game | Plain, warm, exact | "Bu kullanıcı adı alınmış.", "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et." |

Game words are welcome here (seviye, kombo, seri, rekor) — Quezby is a game.
Captions on reels are jokes and may be silly; nothing else may be.

## The game's own words

| Word | Use |
| --- | --- |
| **Post** | What comes down the feed, as the player sees it: "Sıradan post", "Altın post", "Kırmızı postta elini çek", "64 post". Never "reel" in the app, the share text or the store — the code and the product docs keep *reel* as the domain term |
| **Günün akışı** (#17) | The daily challenge: "Herkes aynı akışı oynar · tek hak" |
| **Serbest oyun** | Any number of runs; the button is just "Oyna" |
| **Zirve** | The leaderboard screen and its dock slot; **Senin katın** is the player's own row card |
| **Oyna · Zirve · Lig · Arkadaşlar · Profil** | The dock's five slots, the lobby (Oyna) in the middle |
| **Arkadaşlar** | Finding and following players; its screen's head says "Oyuncu ara, takip et, yarış" |
| **Geç onu** | The one action on a rival: play to pass them. "@ekin'e 1.240 puan" |
| **Bronz, Gümüş, Altın, Platin, Elmas** | League tiers, capitalised as names: "Altın lig" |
| **Terfi bölgesi / Düşme bölgesi** | League zones; "Terfiye 1.240 puan" |
| **Kusursuz seviye!, Şimşek!, Soğukkanlı!, Geri dönüş!** | Named combos, as in-run toasts (with "!") and as plain names on the result |
| **Kombo x1,25** | Always two decimals, comma |
| **Doğrulanıyor…** | While the API replays a run — no number before it answers |
| **Skorun inceleniyor** | A held top score; never "şüpheli" or "hile" to the player |
| **Oyna / Hesabım var, giriş yap** | The ways in, on the welcome: a new player plays first (a guest account and the practice run); **Apple ile devam et / Google ile devam et** and "ya da e-postayla" are on the login |
| **Deneme turu** (DENEME TURU) | A new player's first run: coached, played on the phone, counted nowhere — "Bu tur hiçbir yere sayılmadı." Its score is the "deneme puanı". Never "tutorial" to the player |
| **YENİ POST · 2/4** · **Anladım** | A coach card's ribbon, and the gold slab that starts the post it explained |
| **Sana ne diyelim?** · **Şimdilik geç** | The name, right after the practice run, and the way past it; until then the account is `@guest48128742` ("Şimdilik adın @guest48128742") |
| **Adını seç** | The profile's name door while the name is still the automatic one ("Şimdilik @guest48128742 · bir kez seçersin"). A picked name never changes, so after the pick Ayarlar only shows it, locked: "Kullanıcı adın · @ekin · kalıcı" — never "değiştir" |
| **Seçtiğin ad bir daha değişmez** | Said wherever a name is picked, before it is saved — there is no confirm step |
| **Lige 2 oyun kaldı** · **KİLİTLİ** | The league before a new player's first 3 counted runs: "Lig, ilk 3 oyunundan sonra açılır. Deneme turu sayılmaz." |
| **Hesabını koru** | Attach Apple, Google or an email to a guest account — a step after the name ("Şimdi değil" skips it), and once, when a guest's league opens ("Ligdesin!…") |
| **Oyunu birlikte geliştirelim mi?** · **İzin ver / İzin verme** | The one question about usage analytics (ribbon "SENİN SEÇİMİN"), on the welcome before anything else — and once in the lobby of a phone that predates it. Two slabs of one size, neither gold. It says what is counted ("hangi ekranlara girdiğini ve ne kadar oynadığını sayarız") and what never leaves the phone ("Adın, e-postan ya da konumun gönderilmez") |
| **Kullanım verisi** | The switch in Ayarlar for that answer: on — "Hangi ekranlara girdiğini ve ne kadar oynadığını sayarız."; off — "Yalnızca oyunun çalışması için gereken cihaz bilgisi gider." Never "izleme", "takip" or "tracking" to the player |
| **Apple hesabıma geç** | An Apple or Google account already belongs to another player: switch to it, leaving the fresh guest behind |
| **Giriş yolları** | The same place once the account is kept: what is attached ("Apple ve e-posta bağlı"), **Bağı kaldır** to take Apple or Google off |

## Rules

- **Sentence case** everywhere, except **ribbons and tile names**, which a game
  sets in capitals: "GÜNÜN AKIŞI", "BU HAFTA", "TERFİ BÖLGESİ", "YENİ REKOR!".
  Type those capitals in the source, with the Turkish **İ** (and **I** for ı).
  Never `textTransform: 'uppercase'` — it turns "Lig" into "LIG" and
  "bölgesi" into "BÖLGESI".
- **Errors:** what happened, then what to do, in one or two sentences. Never
  blame, never a raw exception. `src/lib/errors.ts` maps every API code to its
  line; `USERNAME_MESSAGES` in `@quezby/config` is the one source for name rules.
- **Buttons:** a verb — "Oyna", "Tekrar oyna", "Kaydet", "Hesabı koru".
  Destructive buttons name what goes: "Hesabı kalıcı olarak sil".
- **Empty states:** what is missing and the action that fixes it — "Zirve boş…
  İlk sen ol" with **Oyna**.
- **Numbers:** Turkish grouping (`12.345`), `%94,2`, rank as `#12`, unknown
  rank as `—`.
- **Brand:** always **Quezby** — never QUEZBY, never Quezbi.
