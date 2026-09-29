# Quezby Mobile — Design System

**Parent:** [design-language.md](./design-language.md)
**Code:** `apps/mobile/src/ui/`, `apps/mobile/src/navigation/`, `apps/mobile/src/game/`
**Rules:** [../rules/react-native-rules.md](../rules/react-native-rules.md)

> Read this before writing any screen. Every component below already exists;
> building a card, a button, a form row or a sheet by hand is the one way the
> app's look falls apart.

## Surfaces

```
navigation/
  RootNavigator.tsx  update required → splash → Welcome/Login → a new account's first
                     steps (Tutorial → Username → Notifications → Protect) → Username (an
                     old account with no name) → Tabs (Zirve · Lig · Oyna · Mesajlar ·
                     Profil) + Game, Help, Daily, FindFriends, Thread, Friends (a friend
                     list, one screen per player: `getId`), Account, Alerts (the bell's
                     list), History, AvatarEditor. `gate.ts` decides which, from the session and
                     `stores/onboarding` (the steps, kept on the phone per account).
                     No navigation bars anywhere (`headerShown: false`); a screen that
                     needs a head draws `TopBar`. A push that arrives while the game is
                     open drops in over it as a `Toast`; a tapped one — or the one the app
                     was opened from — opens once the game is up: a request the bell's
                     list (Alerts, where it is answered), anything else that friend's Thread
  TabBar.tsx         the dock: five slots on a dark slab, the lobby in the middle as a gold
                     play slab standing out of it; the slot you are on lifts into a magenta
                     tile; a slot with news (`tabBarBadge`) wears the kit's red `Count` —
                     on Mesajlar, the conversations that want a look (a line unread, a VS
                     waiting for you) and the friend requests waiting
  options.tsx        stack options (no header, night behind transitions), tab(), nav theme
  types.ts           one param list per navigator; Game takes { mode: 'free' | 'daily' } or
                     { mode: 'vs', opponent, duelId? } (a VS sent to a friend, or the answer
                     to theirs); Tutorial is the same GameScreen, as a new player's practice
                     run; the Mesajlar slot is `Inbox` ({ segment? } opens it on its
                     friends' side); `Friends` is the stack screen of a
                     friend list ({ username? } — none is yours); finding players is the
                     stack screen `FindFriends`; Hesap bilgileri is `Account`
screens/
  welcome/           the arena, the mark stamped in, "Quezby" in Rubik, the four moves as gems,
                     one gold "Oyna" (a guest account, then the practice run) and "Hesabım var,
                     giriş yap"; a small neutral slab at the top end names the language on
                     screen and opens LanguageSheet
  auth/              Login (TopBar "Tekrar hoş geldin") — Apple / Google, then "ya da e-postayla"
  username/          after the practice run "Sana ne diyelim?" — the field in a tile, magenta
                     "Kaydet", ghost "Şimdilik geç" (the account keeps `guest48128742`); for an
                     old account with no name, the one question before the game, gold "Devam".
                     The line under the title says the picked name never changes
  onboarding/        Notifications — after the name: a bell, "Haberin olsun mu?", the three
                     kinds of news (a friend's request, a VS and its end, a message), magenta
                     "Bildirimleri aç" (the system's own question) and ghost "Şimdi değil";
                     a phone already asked, one whose notifications are on and a build
                     without push skip it. Protect — "Hesabını koru" after it, for a guest:
                     Apple / Google, "E-postayla koru", ghost "Şimdi değil"; a kept account
                     says so before "Devam et", and an Apple / Google account that is
                     another player's can be switched to
  home/              the lobby, drawn as a lock screen: a status strip (framed portrait — your
                     photo — with the league emblem; the bell, `IconButton` "bell" with a red
                     count of what you have not seen yet, → Alerts; Yardım); the clock — "SEZON REKORU", the
                     season best in gold Rubik 64, `RankChips` (Hafta · Ay · Tüm zamanlar)
                     under it, all of it a door to Zirve; then what waits, as `NoticeCard`s of
                     one height: the warn notice while the API keeps this phone's runs off
                     the boards (a failed Play Integrity / App Attest check, `enforced`
                     only); each VS waiting for you (at most three, the one running out
                     first on top — `InboxSummary.waiting`): the friend's portrait, "@deniz
                     sana VS attı", its countdown, a green ✓ (`IconButton tone="ok"`: plays
                     it — playing is the answer) and a red ✗ (declines it), the body opens
                     the Thread; "+N VS daha" opens Mesajlar; "GÜNÜN AKIŞI #17" — open, the
                     rule, its countdown and a small magenta "Oyna"; played, your place,
                     your score in gold and the countdown to the next; the body opens
                     Daily (its stage, board and Paylaş); the league ("KİLİTLİ · Lige 2 oyun
                     kaldı" with a `Meter` before a new player's first 20 counted runs, your
                     place and zone, or "Ligine katıl"); the rival with "Geç onu". Pinned
                     over the dock, outside the scroll: `SwipePlay` — the screen's one gold
                     slab, breathing, chevrons climbing over it, "Yukarı kaydır, oyna" under
                     it: a tap or a swipe up plays free. The consent card comes before the
                     notices while unasked; a guest just seated in a league is asked once
                     to keep the account (SignInWaysSheet, "Ligdesin!")
  leaderboard/       Zirve — a stage with TopBar (countdown, players, search → FindFriends),
                     Herkes / Arkadaşlar, the podium on 3D metal pedestals (crown and a spotlight
                     for #1), the period tabs (Hafta · Ay · Tüm zamanlar — there is no day
                     board), the climb as tiles with "▲ fark", your floor pinned with a gold
                     "Geç onu"
  league/            the week's league: "HAFTALIK LİG", your tier's emblem big between the tiers
                     below and above, TERFİ / DÜŞME BÖLGESİ banners over their rows, last week's
                     result (confetti on a promotion), your floor pinned; before a new
                     player's first 20 counted runs, "Lige N oyun kaldı" with a gold "Oyna"
  daily/             Günün akışı: TopBar with a back slab, "AKIŞ #17", your score and place in a
                     well with the share grid, then "GÜNÜN ZİRVESİ" — its podium and climb
  friends/           Mesajlar — the dock's social tab (InboxScreen): its head carries a
                     `userPlus` slab ("Arkadaş ekle" → FindFriends), and a `Segmented` switch
                     under it: **Mesajlar** · **Arkadaşlar**, each counting what waits on it. Mesajlar: a `PushNudge` while notifications are off; a
                     `ThreadRow` per friend, the one last heard from first (the newest line,
                     when, what is unread, a VS tag: SENİN SIRAN / ONUN SIRASI); with none,
                     "Henüz mesajın yok" and "Arkadaş bul", which turns to the other side.
                     Arkadaşlar: the search field (by the start of a name; with two letters
                     typed its answers replace the list, a `FriendButton` on each row), and
                     with nothing typed `FriendListView` — "İstekler" first, each request a
                     tile with Kabul et and Reddet, then your friends A to Z. The profile's
                     Arkadaş counter opens this side.
                     Friends — a friend list as a screen (`GET /users/{username}/friends`,
                     the same `FriendListView`): a friend's from the count on their card
                     (TopBar @name and the count, read-only, you among them as "· sen"),
                     yours from your own card; anyone else's is locked: `EmptyState` with a
                     lock, "Bu liste kilitli".
  alerts/            Bildirimler (TopBar with a back slab), behind the lobby's bell: what
                     happened among friends, newest first, as `NoticeCard`s — a request
                     (✓ / ✗ right there; the body opens the card), a request accepted, a
                     VS sent to you (✓ plays it, ✗ turns it down, while it waits), and
                     what became of the ones you sent (won, lost, draw, turned down, run
                     out); the body opens the conversation. What was new since the last
                     look is lit (`fresh`) while the list is open; opening it takes the
                     bell's badge to zero (`POST /me/notifications/seen`). Phrases are not
                     here: they are Mesajlar's.
                     FindFriends, a stack screen: search by the start of a name, a
                     `FriendButton` on each row, and "Gönderdiğin istekler" while nothing is
                     typed. Thread — a conversation: TopBar with the name, the head-to-head
                     under it ("3 galibiyet · 1 yenilgi · 0 beraberlik") and a slab to the
                     friend's PlayerSheet; a `FaceOff` panel at the top of the lines; the
                     lines newest at the bottom (`Bubble`s and `EventLine`s), a `PushNudge`
                     under them; a dock with the VS card over the phrase tray (`PhraseChip`s):
                     no VS — magenta "VS at" → VsSheet; your turn — the screen's one gold
                     "Oyna", a ghost "Reddet" and a `CountdownChip`; their turn — your score
                     and the countdown. Read on sight; asked again when the pulse moves
  history/           Geçmiş oyunlar (TopBar with a back slab): every run played to its end,
                     newest first, as the API counted it — a `Segmented` Hepsi / Günün akışı /
                     VS, day headings (Bugün, Dün, then the date), a `RunTile` each; a tap
                     opens RunSheet; with none yet, the gold "Oyna"
  profile/           kept short: a player card (framed portrait — your photo or your
                     initials — with a camera `IconButton` slab on its corner that opens the
                     "Profil fotoğrafı" `ActionSheet`: "Galeriden seç", and "Fotoğrafı
                     kaldır" in red once there is one; your name, tier, a guest's tag;
                     `Counters` — Rekor in gold, Arkadaş (the friends' side of Mesajlar,
                     wearing the requests waiting), Tur; your place on each board), a "Hesabını koru"
                     tile for guests, the "İSTATİSTİKLER" `LobbyCard` with four numbers
                     (Post, Mükemmel, En iyi tepki, En yüksek kombo) opening StatsSheet (all
                     of them grouped — Oyun, Hareketler, En iyiler — the named combos, the
                     most-liked posts as little reels), and the "GEÇMİŞ OYUNLAR" `LobbyCard`
                     to History. The gear opens Ayarlar (SettingsSheet): Dil (LanguageSheet),
                     Titreşim, Kullanım verisi, Yardım; "Arkadaşlar" — Bildirimler
                     (NotificationsSheet) and Engellenenler (BlockedSheet); "Hesap" — Hesap
                     bilgileri, then Çıkış yap last (kept accounts only).
                     Each door opens only after Ayarlar has left the screen (`onClosed`).
                     Account — Hesap bilgileri (TopBar with a back slab): "Kullanıcı adı" —
                     "Adını seç" while the name is automatic (UsernameSheet), a picked one
                     locked, no arrow: "Kullanıcı adın · @ekin · kalıcı"; "Bağlı hesaplar" —
                     a guest's "Hesabını koru" callout, then `SignInWays` (Apple / Google
                     tiles with Bağı kaldır, the email's address, what can still be linked;
                     e-posta → CredentialsSheet); last, the red "Hesabı sil" (DeleteSheet —
                     the name typed to confirm). Its sheets open straight over the page.
                     AvatarEditor frames the picked photo in a circle: one finger moves it,
                     two zoom it (RNGH 3's gesture hooks on Reanimated), never past its own
                     edge; magenta "Kaydet" cuts out the square, scales it to 512 px at most
                     and squeezes it to 100 KB or less (`lib/avatar.ts`, `AVATAR` in
                     `@quezby/config`) before it goes up; "Başka fotoğraf seç" picks again.
                     The photo comes through the system's own picker (`lib/photoPicker.ts`),
                     which asks for no permission
  help/              Yardım (TopBar with a back slab) — the rules, from `game/howTo` and the
                     engine's `RULES`: reels in their feed colours, the dopamine bar, points and
                     combos, the daily, leagues, boards, fair play, account, Sık sorulanlar
  game/GameScreen    the game — a root screen over the tabs, no swipe-back; as `Tutorial`, a
                     new player's practice run: a CoachCard before each kind's first post,
                     closing always ends in its result, which leads on to the name. A VS run
                     wears "VS · @ekin" on the HUD, and its result leads to a rematch or back
                     to the conversation
game/
  useGame.ts         engine + clock + touches → what the screen draws; starts the run
                     with the engine and content versions, keeps an unsent finish; a practice
                     run (`offline`, `outdated`, `tutorial`) stays on the phone — the coached
                     one waits under each card (phase `coach`) and starts the post's clock
                     only when it is put away. A VS run starts on the API's seed — sent to
                     `opponent`, or answering `duelId` — and never falls back to practice.
                     Every post is armed first and goes live on its first drawn frame; the
                     window's end is final (no drag grace) but for a gold hold begun in time
  gesture.ts         raw touches → swipe / like / hold / touch (pure, tested); a swipe counts
                     the moment it is recognised — mid-drag past its threshold, or at the lift
  ReelCard.tsx       one reel, full screen: the kind's backdrop, badge, the post in its format,
                     the side actions and caption; a gold post's time bar hides while it is held
                     (`values.timerShown`) — its fill bar is the clock then
  dress.ts           how a reel draws its post, from seed + index: the pattern, the format's
                     layout, a tilt, a sticker and the parts a format borrows (pools in
                     `@quezby/config`); `mediaOf` puts the format's words in the language
  formats/           one component per format — Scene, Chat, Poll, Chart, Receipt, Fact, Tier,
                     Notifications, Quote, Polaroid, Dump, Treasure, Sign, Cctv; `PostMedia` picks
                     it, `Backdrop` lays the kind's pattern (or the old glows), rays, tape or scanlines
  Hud.tsx            a close slab · the chunky dopamine meter (notched, labelled) · the score in
                     Rubik · level and a gold combo pill (x1,00–x1,50) on their own row — and
                     on a VS, a pill with who it is against ("VS · @ekin")
  FeedbackLayer.tsx  points rising in Rubik, heart burst, a miss slammed on a red slab and shaken,
                     named combos stamped in as tilted gold ribbons
  ResultView.tsx     the run's end, drawn only from the API's answer: a stage with the score
                     slammed in and counting up ("YENİ REKOR!" banner and confetti on a record),
                     then bonuses stamped in, stat tiles, rank tiles (▲/▼, Hafta · Ay · Tüm
                     zamanlar), "Bu hafta geçtiklerin", the league, the daily's grid — about
                     100 ms apart; the buttons slide up last in a tray; a tap skips to the end;
                     review, flagged and practice states, and
                     "Bu cihazda skorlar sıralamaya girmiyor" when `flagReason` is `device`;
                     "Lige N oyun kaldı" while the league is locked; the practice run as
                     "DENEME TURU" with the kinds it never reached, magenta "Devam et" and
                     "Bir daha dene". A VS run leads with its VS tile: sent — "VS GÖNDERİLDİ",
                     a `FaceOff`, the score kept from the friend, the time they have left and a
                     `PushNudge`; over — KAZANDIN! / KAYBETTİN / BERABERE stamped in Rubik in
                     green, red or gold over two score wells and how the two stand; never sent
                     (a run that was not clean) — a callout. Its tray: gold "Rövanş" over a
                     violet "Mesajlara dön" — while the friend has yet to play, a magenta
                     "Mesajlara dön" over "Ana sayfaya dön" — and nothing to share
  howTo.ts           the one source of rule copy: reels (and the move each coach card acts
                     out), bonuses, their order
  content.ts         what a reel looks like — the post the catalog picks for seed + index, dressed
components/          screen-sized pieces shared between screens (below)
```

**The game is a root-stack screen**, never a tab: the bar would sit under the
feed and a swipe-back would end a run by accident. Its only exits are the
close button (which ends and scores the run) and leaving the app (same).

**The phone draws, the server decides.** Once a run ends, every number on
screen — score, stats, ranks, gaps, the league, the share text, the time left
on a board (`endsAt` against `serverTime`), a VS's scores and the time a
friend has left to answer it, a past game — comes from an API answer. A
screen never computes a rank, a gap or a countdown from its own clock.
What two players are to each other — friends, a request either way, a
block — is the API's answer too.

A player's photo (`avatarUrl`) stands in their portrait wherever one is
drawn — rows, the podium, the climb, the league, the lobby's strip,
`FaceOff`, the inbox, a player card; without one, their initials.

## Tokens

`src/ui/tokens.ts` is **generated** (`pnpm tokens`) — never edit it. It holds
the one `arena` palette and the fixed groups `reel` and `marks`.
`src/ui/theme.ts` returns it from `useTheme()` (and as `THEME` outside a
component) with the app's scales: `FONT` (Rubik display, Nunito body),
`TYPE` (+ `score`, `label`), `EMBOSSED` and `embossed(size)` for the hard
shadow under display text, `SPACE`, `RADIUS`, `DEPTH` (outline, lip),
`CONTROL`, `shadow(theme, level)` for what floats, and
`withAlpha(role, opacity)`.

Fonts are static Latin subsets in `assets/fonts` (Rubik Black/ExtraBold,
Nunito SemiBold/Bold/ExtraBold/Black), linked in `ios/Quezby/Info.plist`
(`UIAppFonts`), the Xcode project's resources, and
`android/app/src/main/assets/fonts`. Adding a weight means all three and a
native rebuild. The logo's images (icons, store art, `BrandMark`, the launch
tile) come from `design/make-brand.py` — see design-language.md → "The mark".

## Motion — `ui/motion.ts`

`SPRING` · `SPRING_PRESS` · `SPRING_POP` · `FADE` / `FADE_OUT` ·
`stagger(index)` · `useEntrance(index)` · `usePressScale()`. Juice lives in
the kit (`ui/kit/juice.tsx`): `Stamp`, `CountUp`, `Confetti`, `useShake` —
each plays once and stands down under reduced motion.

## The kit — `ui/kit.tsx`

One import for every screen: `@/ui/kit`. The pieces live a family per file in
`ui/kit/` (`text`, `surfaces`, `slab`, `topbar`, `identity`, `buttons`, `rows`,
`status`, `fields`, `loading`, `segmented`, `meter`, `badges`, `countdown`,
`podium`, `climb`, `result`, `lobby`, `social`, `runs`, `toast`, `coach`,
`consent`, `juice`); `ui/kit.tsx` re-exports them.
A new shape goes into the family it belongs to and into that list.

| Component | Role |
| --- | --- |
| `Txt` | **Every string** outside a reel: `variant` × `tone`; the Rubik roles stand on a hard shadow (`flat` removes it) |
| `Eyebrow` | A section's head: gold glyph, Rubik title, a groove to the edge |
| `Ribbon` | A dark strip with a gold capital label — "GÜNÜN AKIŞI" (typed in capitals) |
| `Screen` / `Arena` | The night arena every screen stands on / the arena alone, for a screen that lays out its own scroll |
| `TopBar` | A screen's head on the arena: title in Rubik, `subtitle`, a back slab (`onBack`), one action (`right`) |
| `Panel` / `Card` | A tile (outline, lip, lit edge) / a pressable tile that sinks and staggers in; `tone` `primary` (yours) / `sunken` (a well) |
| `BrandBand` | The stage — magenta into violet with lanes, for a hero |
| `Gradient` | A two-colour SVG wash |
| `Slab` | Anything pressable that is not a row: face on a lip in the outline, gloss on top; sinks under the thumb |
| `Button` | A slab with a Rubik label. `play` (gold — starts a game, one per screen) / `primary` (magenta) / `secondary` (violet) / `neutral` (tile) / `ghost` (text) / `danger` (red) / `onBrand` (gold on a stage) / `onBrandSoft` (violet on a stage); `sm/md/lg/xl`; `icon`; `loading`; `accessibilityLabel` when a short label needs its context read aloud ("Oyna" → "Günün akışını oyna"); the label shrinks to fit. Never green: green is only the ✓ `IconButton` |
| `IconButton` | A square glyph slab: `neutral` on the arena, `onBrand` on a stage, `ok` (green) and `danger` (red) for the ✓ and ✗ of an answer — a VS on the lobby; `size` `md` 42 / `sm` 34; `loading`; `label` is read aloud; `badge` counts what is new |
| `SocialButton` | "Apple ile devam et" / "Google ile devam et", flat as each company asks, a large `Button`'s height and corners |
| `Divider`, `Avatar`, `IconChip` | A groove; a player's framed portrait (their photo, `src`, over their initials in Rubik — the initials show when there is none or it will not load; `primary` = you); a gem — a glyph on a bright outlined tile |
| `Row`, `ArrowNub`, `SwitchRow`, `Toggle` | A line that opens something (ends in a small arrow slab) — or, without `onPress`, a line that only says something, with no arrow and no press (a picked username, locked) / that arrow / a setting with the game's toggle (green groove, springing knob, role `switch`) |
| `PlayerRow` | A player in a list: portrait (`src`), @name, league, season best — and one action beside it (a `FriendButton`), a separate target from the row that opens their card |
| `Tag`, `Callout`, `Stat`, `StatRow`, `Meter` | A status pill; a message with a gem (copy built from pieces is set in its text); a stat tile (gem, label, Rubik number); a chunky bar with a shine |
| `StatGrid` | Stat tiles in 2 or 3 even columns; a value's size steps down with its length (`valueSize`) — never iOS's shrink-to-fit, which draws a sheet's first row a few points tall |
| `Field`, `PasswordField` | A dark well with a label, glyph and trailing control; the ring lights magenta while you type |
| `Segmented` | A tab strip: the chosen view raised as a magenta slab out of a dark groove |
| `Loading`, `Skeleton`, `SkeletonList`, `EmptyState` | Waiting (gold spinner, dark skeleton tiles) and nothing-yet (a gem, a title, the fix) |
| `MedalBadge` | A coin in its metal on its rim — a crown for first, a medal for the others; `sm/md/lg` |
| `TierBadge` | A league emblem in the tier's metal, outlined, its mark cut in; `showLabel`; `sm/md/lg/xl` |
| `CountdownChip` | Time left, in cyan on a dark pill, counted on the server's clock (`endsAt` + `serverTime`) |
| `Podium` | A board's top three on 3D pedestals in their metals, with portraits (`avatarUrl`) and coins, a crown dropping on #1; 2-1-3; rises once |
| `Spotlight` | Rays of light behind a winner or a tier's emblem, drawn once in the colour given |
| `ClimbRow` | A board row from #4 down as a tile: rank, portrait (`avatarUrl`), name, score and "▲ 1.240" to pass the row above; yours in magenta; `detail` ("3 gün") |
| `FloorCard` | "Senin katın" — your floor pinned under a board: rank in gold, who to pass and how far, "Geç onu" |
| `BonusChip` | A named combo as a pill with its gem: Kusursuz seviye, Şimşek, Soğukkanlı, Geri dönüş, `×count`, `+points` |
| `ShareGrid` | The server's emoji share grid, one square to a cell |
| `LobbyCard` | A door: a gem, its capital name over a Rubik title, live state on the right, an arrow slab when it opens something; sinks under the thumb — the profile's İSTATİSTİKLER and GEÇMİŞ OYUNLAR |
| `NoticeCard` | A notification — on the lobby's lock screen and in Bildirimler: a gem or a portrait (`lead`), what it is in capitals over one line, one live line (`meta`: words, a `CountdownChip`, a `Meter`, a `Tag`), its answer at the end (`right`). All the same height (76). `fresh` lights its edge and its name in magenta: not seen yet. The body (`onPress`) and the answer are two targets side by side — ✓ never opens the body |
| `PlayButton` | The gold play slab: breathes 1 → 1.04 → 1 (1.6 s each way) with a glint crossing it — the only loop outside a reel; `breathing` pauses it, reduced motion never starts it |
| `SwipePlay` | The lobby's one gold action, as a lock screen's unlock: `PlayButton` under three climbing chevrons, a line under it ("Yukarı kaydır, oyna"). A tap plays, and so does a swipe up (`usePanGesture`: ≥ 44 pt or a flick), the slab following the thumb and springing back; the chevrons climb on the slab's breath |
| `RankChips` | Your place on each board in gold, one well per board; "—" where you have not placed |
| `Counters` | A few numbers side by side, each in a well over its name — the profile's Rekor (gold) · Arkadaş · Tur, the statistics tile's four; a counter with `onPress` sinks and may wear a `Count` (`badge`) |
| `FaceOff` | Two players face to face: you on the start side framed in magenta, them on the end side in violet, a caption under each portrait when given ("SEN", `@ekin`), and a gold "VS" between — or, for two who have played before, how they stand (`middle`: `3 – 2`). The lobby's rival, a conversation's head-to-head, the VS sheet and a VS just sent |
| `ThreadRow` | A friend in the inbox: portrait, name over the conversation's newest line (lit while unread, quiet once read), when it came, the unread `Count`, and a VS tag under the line while one waits on either of you |
| `Count` | How many wait: a red pill, `9+` past nine — on a `ThreadRow`, and on a dock slot (`TabBar` draws it from `tabBarBadge`) |
| `Bubble` | A phrase in a conversation: yours on the end side as a magenta slab, your friend's on the start side as a tile, each with its time under it |
| `EventLine` | What happened between two friends rather than what was said — friends now, a VS sent, won, lost or drawn, turned down, run out — as a strip in the middle of the conversation with its gem; a result (`strong`) sets its word in Rubik in the colour of how it went, the two scores under it |
| `PhraseChip` | A phrase in the tray: a small neutral slab that sends it; dimmed while one is on its way |
| `RunTile` | A past game: its mode's gem (free play, the daily, a VS), its title over posts · time · hour, the score in Rubik on the end side — gold, with "REKOR" under it, when it is the season's best — and what became of it as a tag; ends in an arrow slab |
| `Toast` | A push that arrives while the game is open: a tile with a bell that drops in from the top with the push's own words, opens what it is about when tapped, and slides back up by itself |
| `CoachCard` | A new kind of post, before it starts: "YENİ POST · 2/4", its gem, a hand acting the move out (swipe, double-tap, hold into the green zone, keep still — twice, then still), its name and line, the gold "Anladım" that starts the post |
| `ConsentCard` | The one question about usage analytics: "SENİN SEÇİMİN", "Oyunu birlikte geliştirelim mi?", what is counted and what never is, and **İzin verme** / **İzin ver** — two slabs of one size, violet and magenta, never gold. On the welcome before the ways in; once in the lobby of a phone that never saw it |
| `Stamp`, `CountUp`, `Confetti`, `useShake` | Juice: slam a value in; count a number up (the final value is its accessibility label); a burst of confetti on a key; a small shake |

Overlays are `ui/sheet.tsx`: `Sheet` (a dark tile rising from the bottom, a
Rubik title, a red close slab), `FormSheet` (Hesap bilgileri's one username
pick and delete, the email flow), `ActionSheet` (tile rows with arrow slabs — the
profile photo's "Galeriden seç" / "Fotoğrafı kaldır"), `ActionList` (those
rows on their own, for a sheet that keeps a few rarer actions under its main
one — PlayerSheet's "Diğer" — instead of opening a second sheet over itself).
Never a `Modal` with `animationType="slide"`. One sheet never opens over
another that is still leaving: the next one waits for `onClosed` (the
profile's "E-postayla koru" does exactly this, and so does a player card's
"VS at" before `VsSheet`; Ayarlar's Hesap bilgileri and a card's friend
count wait the same way before they open a screen). Apple's and Google's own sign-in sheets may open
over a sheet — they are the system's, not ours.

Icons are `ui/icons.tsx` — our own 24×24 stroke set, game glyphs included
(`trophy`, `crown`, `medal`, `flame`, `heart`, `bolt`, `arrowUp`, `hand`,
`handStop`, `vibrate`, `podium`, `mountain`, `trendUp`, `trendDown`,
`target`), people (`users`, `userPlus`, `userCheck`, `userMinus`), friends
(`inbox`, `message` — the Mesajlar slot — `swords` for VS), time
(`calendar`, `hourglass`, `clock`) and affordances (`help`, `search`, `grid`,
`camera`, `image`, `flag`, `ban`, `bell`, `chevronUp` over the unlock slab,
…). `apple`
is the one filled glyph: Apple's logo is solid in every colour it comes in.
**Add a glyph there rather than importing a set.** Logos live in
`ui/brand-mark.tsx`: our `BrandMark` (the app icon as an Arena tile, a bitmap
from `design/make-brand.py`) and Google's four-colour `GoogleMark`, neither of
which takes a tint.

`components/` holds the screen-sized pieces more than one screen uses:

| Component | Role |
| --- | --- |
| `LanguageSheet` | The six languages, each in its own words and its own script (Cairo for Arabic, whatever the game speaks), its name in the language on screen under it; a language read the other way (to or from Arabic) asks first — the game reloads to turn around |
| `UsernameField` | The username input everywhere: lower case as typed, three rules ticking off under it (length, characters, a letter; a misplaced dot or star is only said when typed), availability in the trailing slot |
| `PlayerSheet` | A player's card from any row: portrait, tier, what you are to each other as a tag (Arkadaşın, İstek gönderildi, Seni eklemek istiyor, Engelledin), their friends count — a neutral slab that opens the list (once the card has left the screen) on your own card and a friend's, plain words on anyone else's, season best in gold, weekly and all-time place, a few lifetime counts — then the one main action the relation allows: "Arkadaş ekle"; "Kabul et" / "Reddet"; "Geri al"; "VS at" and "Sohbet" for a friend (no "Sohbet" when opened from the conversation); "Engeli kaldır". "Diğer" opens an `ActionList` in place: "Arkadaşlıktan çıkar" (a friend), "Engelle", "Fotoğrafı bildir" (when there is a photo), "Kullanıcı adını bildir". The VS sheet or the conversation opens once the card has left the screen |
| `PlayerCard` | `Portrait` (the 72/92pt framed portrait of a profile — the photo, or the initials; `onEdit` pins a camera `IconButton` slab to its corner) and `SeasonBest` (the gold record well) |
| `FriendButton` | The small slab beside a player in FindFriends, by what they are to you: "Ekle"; "Geri al" while your request waits; "Kabul et" and a close glyph slab (read aloud "Reddet") while theirs waits, so the name keeps its room; "Sohbet" once you are friends; nothing for a player you blocked. Only the pressed row shows a spinner, and the API's answer shows at once |
| `VsSheet` | Sending a VS: `FaceOff`, the four rules (one feed, a try each; you play first and your score stays hidden; your friend has a while, then it counts for nobody; a VS counts on no board, league or stat) and the sheet's one gold "Oyna" — the game opens once the sheet is gone |
| `RunSheet` | A past game from Geçmiş oyunlar: the score (gold and "REKOR" when it is the season's best), when it ended, what became of it, the stat tiles and bonus chips of the replay, and a VS's two scores; `runTitle`, `runLook` and `runTag` name, gem and tag a run for its `RunTile` too |
| `PushNudge` | Notifications are off, in a warn card with a bell: never asked → "Bildirimleri aç" (the system's question); turned down → "Ayarları aç" (the phone's settings). In the Mesajlar tab and a conversation, where "Gizle" puts it away for a week, and on a VS just sent; nothing while they are on or in a build without push |
| `NotificationsSheet` | Ayarlar → Bildirimler: where the phone stands (a slab to allow them, the way to the phone's settings, or not in this build) over three toggles kept on the account — Arkadaşlık, VS, Hazır mesajlar (`pushFriends`, `pushVs`, `pushMessages`) |
| `BlockedSheet` | Ayarlar → Engellenenler: the players you blocked, the latest first, each with "Engeli kaldır" |
| `SignInWays` | The ways in, outside any sheet: the attached ones (Apple / Google with "Bağı kaldır" — the API keeps the last one; the email with its address), `SocialButton`s for the rest, and "E-postayla koru" / "E-posta ve şifre bağla", which hands over to the caller (`onEmail`). On Hesap bilgileri, with `attachedHeading={false}` |
| `SignInWaysSheet` | "Hesabını koru" for a guest, "Giriş yolları" once kept: `SignInWays` in a sheet — the lobby's reminder and the profile's nudge; `description` says why when it comes up on its own |
| `CredentialsSheet` | The email and password `FormSheet` — a guest's "Hesabı koru", or one more way in; opened from the profile, the Protect step and the lobby's reminder |
| `ScopeSwitch` | Herkes / Arkadaşlar — a dark well with a magenta slab that springs to the side that is on |
| `SummitBoard` | `layoutBoard()` — which entries stand on the podium, which climb, where the break before your own rows goes — and the podium stage that holds its place while a board loads |
| `BoardStage` | The magenta stage a board stands on (`BoardStage`), the players pill, and `useArrival` |
| `FriendsEmpty` | A friends board with only you, as a tile of empty seats: no friends yet → "Arkadaş bul"; friends have not played → "Oyna" |
| `FloorDock` | Holds `FloorCard` above the dock on a dark shelf, rises in once and reports its height so the list leaves room |

Data comes through hooks over `@/api/client` — never a `fetch` in a screen:
`hooks/useBoards.ts` (boards, the daily, the league, stats, players, search),
`hooks/useSocial.ts` (what the badges count — with the friend count, the
bell's unseen count and the VS waiting on the lobby, `useInboxSummary` — the
bell's list and its "seen" (`useNotifications`, `useSeeNotifications`), the
inbox, requests, a friend
list (`useFriendList`, `['friend-list', username]`; `['friends']` is the
inbox's conversations), a conversation, phrases, blocks, reports, declining a
VS — none of it polls on its own), `usePulse` (the inbox's heartbeat: one
number, `GET /me/pulse`, asked every 3 s on Mesajlar, a conversation, a friend
list, Bildirimler and Arkadaş bul, every 10 s elsewhere, never mid-run or in the
background; when it moved, `refreshInbox` asks again for the badges and the
lobby's VS notices, and for the list or conversation on screen — the current route comes from `stores/route`; a push
refreshes at once), `useHistory`, `useAvatar`,
`usePush`, `useMe`, `useSocialAuth`, `usePendingRunSender`. Push lives in
`lib/push.ts` (Firebase Cloud Messaging; a build without Firebase's files
answers "unavailable") and `stores/push`.

## Inside a reel

A reel is content: it draws with `reel.*` colours and `TYPE` roles directly
(`ReelCard`, `Hud`, `FeedbackLayer`), not with `Txt` tones, because it must
look the same in both themes. Everything around the feed — result, home,
profile — goes back to the kit.

## Voice

See [ui-writing.md](./ui-writing.md). Short, warm, a little cheeky inside the
game ("Takıldın!", "Yakalandın!", "Dopamin bitti"); plain and exact around
accounts and errors.
