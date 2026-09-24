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
| **Apple ile devam et / Google ile devam et / Misafir olarak başla** | The ways in |
| **Hesabını koru** | Attach Apple, Google or an email to a guest account |
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
