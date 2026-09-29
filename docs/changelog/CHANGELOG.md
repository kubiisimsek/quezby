# Changelog

## 2026-09-29 — The bell, and Mesajlar in two

The owner asked where the notifications were ("VS geldi" had no place of its
own) and why the lobby lost its mailbox, and wanted the friends and the
search on the Mesajlar tab.

- **The bell:** the lobby's status strip has a bell (`IconButton` "bell")
  with a red count of what the player has not seen yet (`InboxSummary.
  notifications`); it opens **Bildirimler** (`Alerts`): a request (✓ / ✗ right
  there), a request accepted, a VS sent to you (✓ plays it, ✗ turns it down,
  while it waits), and what became of the ones you sent — won, lost, draw,
  turned down, run out — newest first, as `NoticeCard`s (`fresh` lights what
  is new). Opening it clears the badge. A tapped friend-request push opens it.
  Phrases stay in Mesajlar.
- **Mesajlar in two:** a `Segmented` switch — **Mesajlar** (the
  conversations) · **Arkadaşlar** (a search by name, the requests, the friend
  list — `FriendListView`, shared with the friend list screen). Each side
  counts what waits; the dock slot counts both. The profile's Arkadaş counter
  opens the friends' side (`Inbox { segment: 'friends' }`); Profil's slot no
  longer carries a badge.
- **Arkadaş ekle:** a `userPlus` slab beside Mesajlar's title opens Arkadaş
  bul.
- **API:** `GET /me/notifications` → `{ notifications, unseen }` and
  `POST /me/notifications/seen`; `users.notifications_seen_at`;
  `InboxSummary.notifications`.
- Copy in six languages (`alerts` catalog; Mesajlar's switch). Analytics
  screen `alerts`.
- Contract: `NotificationKind`, `NotificationItem`, `NotificationsResponse`,
  `InboxSummary.notifications` (types); `me.notifications`,
  `me.seeNotifications` (SDK).
- Tests: the API's `NotificationsTest` and the inbox's exact JSON; the app's
  `AlertsScreen`, `InboxScreen` (the switch, the search, the requests),
  `HomeScreen` (the bell), `ProfileScreen`, `useSocial`, `usePulse`,
  `NoticeCard`, analytics screens.

## 2026-09-29 — A lock-screen lobby, Mesajlar, friend lists, a shorter profile

The daily challenge took about two thirds of the lobby, so a day without it
made the game look empty; the lobby's mailbox opened a "friends" tab that was
really an inbox, with no friend list anywhere; the profile stacked eight stat
tiles, two panels and every account door. The owner asked for an original
lobby, not another game's.

- **Lobby — "kilit ekranı":** drawn as the phone's lock screen. The season
  best stands where the time would ("SEZON REKORU", gold Rubik 64) with the
  places under it (→ Zirve). What waits comes in as `NoticeCard`s of one
  height: a VS waiting for you — the friend's portrait, "@deniz sana VS
  attı", its countdown, a green ✓ that plays it (playing is the answer) and a
  red ✗ that declines it, three at most then "+N VS daha" → Mesajlar; "GÜNÜN
  AKIŞI #17" with a small magenta Oyna (read aloud "Günün akışını oyna"), or
  your place and score once played (the stage, board and Paylaş are on the
  Daily screen); the league; the rival with Geç onu; the device warning.
  Pinned over the dock: `SwipePlay`, the screen's one gold slab — "Yukarı
  kaydır, oyna", a tap or a swipe up plays free. Gone: the daily stage and
  reel fan, the VS door, the records card, the mailbox button.
- **Dock:** Zirve · Lig · Oyna · **Mesajlar** · Profil. Mesajlar (`Inbox`,
  was `Friends`) is the conversations and their VS only; its badge counts
  those. Requests moved to the friend list; Profil's slot counts them.
- **Friend lists:** a stack screen `Friends` ({ username? }; one screen per
  player through `getId`). Yours opens from the profile's Arkadaş counter —
  requests first with Kabul et / Reddet, then friends A to Z, "Arkadaş bul"
  in the corner; a friend's opens from the count on their card (PlayerSheet's
  count is a slab for you and friends, plain words for anyone else); anyone
  else's is locked ("Bu liste kilitli"). A tapped friend-request push opens
  your list.
- **Profile:** portrait, name, league, `Counters` Rekor · Arkadaş · Tur, the
  places, an İSTATİSTİKLER tile with four numbers opening `StatsSheet`
  (grouped: Oyun, Hareketler, En iyiler; named combos; most-liked posts), and
  Geçmiş oyunlar. The "… ile bağlı" tag moved to Hesap bilgileri.
- **Ayarlar → Hesap bilgileri:** one row right above Çıkış yap ("@ekin ·
  Apple bağlı", a guest's "Misafir hesap") opens the `Account` screen:
  Kullanıcı adı (Adını seç while automatic, locked after), Bağlı hesaplar
  (`SignInWays`, split out of `SignInWaysSheet`), and Hesabı sil in red.
  The name, ways and delete rows left the sheet; `UsernameSheet` and
  `DeleteSheet` have files of their own.
- **API:** `GET /users/{username}/friends?cursor=` → `{ friends, total,
  nextCursor }`, A to Z, 50 a page (`NameCursor`, `FriendListRequest`), only
  for the player and their friends — anyone else `403 friends_hidden`; banned
  players and both sides of a block with the viewer left out; `relation` is
  the viewer's. `GET /me/inbox` adds `friends`, `waiting` (the VS waiting for
  the player, soonest expiry first, three at most) and `serverTime`
  (`InboxService::waitingFor`, one query).
- **Kit:** `NoticeCard`, `SwipePlay`, `Counters`; `IconButton` gains `ok` /
  `danger` tones, `size="sm"` and `loading`; `Button` an `accessibilityLabel`;
  the `chevronUp` glyph.
- **Analytics:** screens `friend_list` and `account` (codes only added; the
  Mesajlar tab keeps `friends`); the admin panel labels them.
- **Copy:** new lines in all six languages; the dock word is Mesajlar /
  Messages / Chats / الرسائل / Messages / Mensajes; Yardım's answers point to
  Hesap bilgileri and the friend count.
- Contract: `WaitingDuel`, `InboxSummary`, `FriendListResponse`,
  `friends_hidden`, `AnalyticsScreen` (types); `users.friends` (SDK).
- **Stat tiles:** a value is sized by its length (`valueSize`: 21 → 17 → 15 →
  13 pt) instead of iOS's shrink-to-fit, which drew the first row of a
  sheet's `StatGrid` a few points tall ("…" on the stats sheet's Tur, Post and
  Oyun süresi, tiny ranks on a player card).
- **API tests:** `phpunit.xml` sets `memory_limit` to 512M. The suite
  (1.833 tests in one process) had outgrown the CLI's 128M and died in
  `CheckpointTest` with "Allowed memory size exhausted".
- Tests: Pest `FriendListTest`, `InboxTest`, `DuelTest`, `ErrorCodeParityTest`;
  SDK endpoints; config analytics; the app's `HomeScreen`, `InboxScreen`,
  `FriendsScreen`, `ProfileScreen`, `StatsSheet`, `AccountScreen`,
  `SettingsSheet`, `PlayerSheet`, `SignInWays`, `TabBar`, `usePulse`,
  `useSocial`, `NoticeCard`, `SwipePlay`, `Counters`, `IconButton`, icons,
  analytics screens, Help.

## 2026-09-28 — The inbox is live without a socket: the pulse

With two phones open, a VS, a phrase or a request used to show only when the
other player opened that screen: the badges asked once a minute, an open
conversation every 20 s, and the Arkadaşlar list not at all. Shared hosting
has no WebSocket, so the inbox now has a pulse.

- **API:** `users.inbox_stamp` (migration `2026_09_30_000700`) goes up, for
  both players, with every request sent, friendship begun or ended, block that
  parted two friends, and every line (`Messenger::say`: a phrase, "friends
  now", VS invite, result, refusal, expiry); for the blocker alone with a
  block or its lifting (`InboxStamp`). `GET /me/pulse` → `{ stamp }` answers
  with it, after settling the player's waiting VS whose time ran out
  (`DuelService::settleDue`), so both sides hear of an expiry with nothing
  opened. Two indexed reads; its own throttle, `pulse`, 60/min.
- **App:** `usePulse` asks for the number every 3 s on Arkadaşlar, a
  conversation and Arkadaş bul, every 10 s elsewhere, never mid-run or in the
  background. When it moved, `refreshInbox` asks again for the badges and the
  lobby's VS card, and for the list, requests or conversation on screen;
  everything else is marked old and asked again when it shows. The screen on
  show comes from `stores/route` (the navigator's `onStateChange`). The
  badges' 60 s and the conversation's 20 s polling are gone. A push still
  refreshes at once.
- Contract: `Pulse` (types), `me.pulse` (SDK).
- Tests: the API's `PulseTest`; the app's `usePulse.test.tsx`; the SDK's
  endpoint list.

## 2026-09-28 — Plainer words on the first screens

- The welcome line ends at the practice run: "Önce bir deneme turunda
  oynayarak öğren." The "— o tur sayılmaz" aside is gone in all six languages.
- The username field lists three rules under it: length, the characters
  allowed, a letter. "Harf ya da rakamla başlar ve biter" and "Nokta ve yıldız
  art arda gelmez" are no longer listed (`UsernameRule` lost `edges` and
  `symbols`). The rules still hold, in the app and on the API: a name that
  breaks one hears it in the field's one-line error, only then.
- Profil's past-games door is shorter in German, French and Spanish ("Alle
  deine Runden", "Toutes tes parties", "Todas tus partidas"); the longer titles
  were cut off.
- Tests: `username.test.ts` (config), `WelcomeScreen.test.tsx`.

## 2026-09-28 — Friends, VS, past games, profile photos and push

- **Friends instead of follows.** A friendship takes two yeses: find a player
  by the start of their name (`FindFriends`), send a request, and they accept
  or turn it down. A request can be taken back, a friendship ended — its
  conversation and any open VS go with it — and a player blocked (it ends
  everything between the two; Ayarlar → **Engellenenler** lifts it). 500
  friends and 100 waiting requests at most. The follows there were became
  friends where two players followed each other and requests where only one
  did (`FollowsToFriends`, inside the migration): nobody is anyone's friend
  without having asked. Friends boards ("Herkes | Arkadaşlar") are your
  friends and you; `isFollowing` became `isFriend`.
- **The Arkadaşlar tab is the inbox.** Requests first (**Kabul et** /
  **Reddet**), then one conversation per friend (`ThreadRow`: the newest line,
  the unread count, a VS tag). Friends talk only in ten preset phrases
  (`PHRASES` in `@quezby/config`, `App\Enums\Phrase`, held together by
  `fixtures/social.json`) — nothing typed ever travels between players — at
  most 20 to one friend a day; the game adds its own lines (friends now, a VS
  sent, its result, turned down, run out). Lines are kept 90 days
  (`inbox.keep_days`). The dock slot's badge and the lobby's mailbox count
  requests and conversations that want a look (`GET /me/inbox`, asked every
  minute while the game is open, on each push and on coming back to it).
- **VS.** Two friends, one seed, one attempt each: the sender plays first and
  their score stays hidden until the friend plays; the friend has 48 hours
  (`duels.expire_hours`), then it counts for nobody. A VS run is replayed like
  any other and never ranks: a clean one is **`played`** (a new `RunStatus`),
  one with a hard flag is `flagged` and loses — the sender's voids the VS. It
  counts on no board, league, stat or record, and has nothing to share. The
  app: `VsSheet` (a `FaceOff`, the four rules, the gold "Oyna"), a "VS · @ekin"
  pill on the HUD, the result's VS tile (sent, won, lost, drawn or void) with
  gold **Rövanş** and **Mesajlara dön**, the conversation's VS card (send one,
  answer with the screen's one gold "Oyna" or turn it down, or wait with the
  countdown) and the lobby's "SENİ BEKLEYEN VS".
- **Past games** (`History`, the profile's "GEÇMİŞ OYUNLAR" door): every run
  played to its end, newest first, 30 a page, Hepsi / Günün akışı / VS, in
  days (Bugün, Dün, then the date); `RunSheet` opens one with its stats,
  bonuses and a VS's two scores (`GET /me/runs`, `GET /me/runs/{runId}`).
- **Profile photos.** Picked from the library through the system's own
  picker (no permission), framed in `AvatarEditor` (pinch and pan), cut,
  scaled to 512 px and squeezed to 100 KB or less on the phone (`AVATAR`); the
  API decodes it, crops it square, encodes a fresh JPEG with GD — no EXIF, no
  location — under a new name each time, and serves it without a token, cached
  for a year (`PUT|DELETE /me/avatar`, `GET /media/avatars/{file}`, the
  `avatars` disk outside the web root). Everyone sees it: rows, the podium,
  the climb, the league, the lobby's strip, `FaceOff`, the inbox, a card.
- **Reports.** A player's photo or name can be reported from their card
  ("Diğer"), once each per reporter; nobody is told who reported. The panel's
  new **Bildirimler** page lists the reported players (open, resolved,
  dismissed) behind a sidebar badge (`counts.reports`); the player page shows
  the photo, the open reports, **Fotoğrafı kaldır** and **Bildirimleri kapat**
  — both take a reason and are audited (`player.avatar_remove`,
  `player.reports_dismiss`) — and resetting a name closes the reports about
  it. The player page counts friends and the players who blocked them where it
  counted follows.
- **Push notifications** through Firebase Cloud Messaging
  (`@react-native-firebase/messaging`; `PushService` on the API, sent after
  the response, no queue or cron): a friend request, a request accepted, a VS
  sent, a VS's result, a phrase (one push per friend every 5 minutes at most),
  in the receiver's language (`lang/{locale}/push.php`, `phrases.php`). A new
  player is asked right after the name (`NotificationsScreen`, "Haberin olsun
  mu?"); the old ask after the first social move is gone. Where they are off, a
  `PushNudge` offers them again — the inbox and a conversation (hideable for a
  week) and a VS just sent — or the phone's settings once only those can.
  Ayarlar → **Bildirimler** has three toggles kept on the account
  (`pushFriends`, `pushVs`, `pushMessages`). A push that arrives while the game
  is open drops in as a `Toast`; a tapped one opens its conversation — a
  request, the Arkadaşlar tab.
  Firebase's app files are git-ignored: a build without them has no push. The
  panel's Sistem page says whether pushes can go out
  (`QUEZBY_PUSH_ENABLED`, `FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS`) and
  whether PHP's GD is there.
- **No day board.** Zirve, the profile, the lobby's records, the result and the
  panel's Sıralamalar show Hafta, Ay and Tüm zamanlar; the API keeps each day's
  best only to add up league points, and no route serves it as a board. The
  daily challenge's board stays. The result's players you passed are this week's
  ("Bu hafta geçtiklerin").
- **The league opens after 20 counted runs** (was 3;
  `QUEZBY_LEAGUE_UNLOCK_RUNS`). A VS never counts towards it.
- **Kit:** `FaceOff`, `ThreadRow`, `Count`, `Bubble`, `EventLine`,
  `PhraseChip` (`ui/kit/social.tsx`), `RunTile` (`runs.tsx`), `Toast`
  (`toast.tsx`); `ActionList` in `ui/sheet.tsx`; `Avatar`, `Portrait` (with a
  camera slab), `PlayerRow`, `ClimbRow` and `Podium` draw the photo; the dock
  draws a slot's badge (`tabBarBadge`). Glyphs `camera`, `image`, `flag`,
  `ban`, `bell`, `userMinus`, `inbox`, `message`, `swords`. New catalogs
  `inbox`, `vs`, `history` and `push`, `friends` rewritten; `t.fmt.date`,
  `time` and `ago`; iOS's photo reasons and Android's notification channel in
  the six languages.
- **Panel:** VS runs are "VS" and "Oynandı" and offer neither Onayla nor
  Reddet; a VS run's page names its VS; `Avatar` takes `src`, `alt`, `onBrand`
  and `2xl`, `Page` a `leading` slot; the CSP lets photos load from the API.
- **Contract:** `PlayerRelation`, `PlayerSummary.relation` and `avatarUrl`,
  `PlayerCard.friends`, `FriendRequestsResponse`, `RelationResponse`,
  `DuelView` / `DuelBrief` / `HeadToHead`, `InboxMessage`, `FriendThread`,
  `ThreadResponse`, `InboxSummary`, `Phrase`, `BlocksResponse`,
  `ReportReason`, `PushData`, `PushTokenRequest`, `UpdateAvatarRequest`,
  `RunSummary`, `RunHistoryResponse`, `RunDetailResponse`, `Me.avatarUrl`,
  `UserSettings.push*`, `RunMode` `vs`, `RunStatus` `played`,
  `FinishRunResponse.duel`; `LeaderboardPeriod` without `daily`, `Ranks`
  without it; admin `AdminReportRow`, `AdminCounts.reports`, `AdminRunDuel`,
  `AdminPlayerResponse.social` and `openReports`, `AdminSystem.gd` and `push`.
  The SDK's follow calls are gone; `me.inbox`, `friends`, `friendRequests`,
  `thread`, `readThread`, `sendPhrase`, `blocks`, `runs`, `run`,
  `updateAvatar`, `removeAvatar`, `registerPushToken`, `unregisterPushToken`,
  `users.addFriend`, `removeFriend`, `block`, `unblock`, `report`, `duels.get`,
  `decline`; admin `reports.list`, `players.removeAvatar`, `dismissReports`.
- Store: the listings mention friends, VS, the inbox, past games, photos and
  notifications; the English one says the game speaks six languages. The iOS
  privacy manifest also declares Photos or Videos, Contacts (the friends list)
  and Other User Content (the phrases), all linked and not tracking, for app
  functionality; the push token falls under Device ID
  (`apps/mobile/store/README.md` → "Gizlilik etiketleri").
- Android: `versionName` is 1.0.0, as on iOS and in `package.json`. It was
  the template's 0.0.1, below every environment's
  `QUEZBY_ANDROID_MIN_VERSION`, so an Android build stopped on "Güncelleme
  gerekli" wherever it pointed.
- Docs: `docs/design/*`, `docs/rules/*`, `CLAUDE.md`; the product and API docs
  describe friends, the inbox, VS, past games, photos, reports and push.
- Tests: the app's `FriendsScreen`, `FindFriendsScreen`, `ThreadScreen`,
  `HistoryScreen`, `NotificationsScreen`, `AvatarEditorScreen`,
  `BlockedSheet`, `NotificationsSheet`, `PushNudge`, `usePush`, `lib/avatar`,
  `lib/push` and the social kit (`Social.test.tsx`); `social.test.ts`
  (config); the API's `FriendTest`, `BlockTest`, `InboxTest`, `DuelTest`,
  `RunHistoryTest`, `AvatarTest`, `ReportTest`, `PushTest`,
  `FollowsToFriendsTest` and `SocialParityTest`; the panel's
  `ReportsPage.test.tsx`; and every suite the change touched.

## 2026-09-28 — Posts get formats: chats, polls, receipts, signs… and many more of them

- **Every post is drawn in a format** (`packages/config/src/content/types.ts`):
  a chat screenshot, a poll, a line chart, a till receipt, one big number, a
  tier list, a lock screen of notifications, a quote card, a scene (the emoji
  as a photo: disc, crop, frame, wallpaper or spotlight), a friend's polaroid
  or photo dump, a gold post's treasure, a red post's warning sign or security
  camera. A kind wears only its own formats (`FORMATS_OF`) and keeps its
  colour and badge, so it still reads first. No photos, no downloads: every
  format is drawn by the app (`apps/mobile/src/game/formats/`), whole on its
  first frame and the same offline.
- **The same post dresses differently from run to run** (`game/dress.ts`):
  the pattern on its colour (dots, stripes, grid, waves, confetti or the old
  glows), the format's layout, a tilt, a sticker and the parts a format
  borrows — a receipt's other items, a lock screen's other notifications, a
  poll's shares, a chart's line — from `content/pools.ts`. All from the seed
  and the reel's place (`SALT.dress`): a run always looks the same and the
  daily feed is one look for everyone. None of it reaches the API.
- **The catalog grows from 39 to 1,000 posts** (skip 560, like 200, hold 120,
  freeze 120) in six languages, with 42 new accounts (63 in all): 284 by
  format in `content/posts/*.ts`, then 677 in twelve themes in
  `content/posts/themes/` — home, food & shopping, school, work, family,
  friends, the phone, the outdoors, animals, hobbies, travel, sleep — each
  written by one hand so no joke is told twice. The parts pools hold 70
  receipt items and 60 notifications. At about 70 ordinary posts a run, a
  100-post run meets a post it has already seen about 5 times (it was 66),
  and then in another dress. The first 39 keep their places (the fixtures
  now hold each id's emoji and format too). The
  content version stays **1** while the game is on staging: the lists grow in
  place, at their ends; once the app is in the stores, a list that grows is a
  new version. `apps/api/app/Content/Catalog.php` has the new lengths —
  **deploy the API with the app**, or the API credits likes and misses to the
  wrong posts.
- **Every line is checked** (`packages/config/scripts/content-rules.ts`): a
  length for each field so it fits its box, French no-break spaces, Spanish
  ¿¡, Arabic's own punctuation and Latin digits, capitals typed (never
  transformed) where a till or a sign prints them, the same digits in every
  language for a big number. `scripts/check-content.ts` runs them on a file
  while it is being written; `scripts/similar-content.ts` lists the posts
  whose Turkish words overlap most, for a writer to read for repeats.
- **The admin panel's Content page is paged** like every other list
  (`GET /admin/content?page=&perPage=`); its totals and the most missed /
  most liked are ranked by the API over every page (`topMissed`,
  `topLiked`), and each post names its format.
- New palette props in `design/palette.mjs` → `reel` (glass, pattern, paper,
  photo, tape, bubble, likeTiles, holdRay, hazard, sign, scan); new words in
  `messages/game.ts` → `post` (ANKET, TOPLAM, çevrimiçi, the axis' days and
  months…); `t.fmt.percent` and `t.fmt.price`.
- Tests: `dress.test.ts`, `formats.test.tsx`, `ReelCard.test.tsx`,
  `content.test.ts` (app); `content.test.ts` (config: every post and pool
  through the rules, every format worn, no joke twice); `ContentTest.php`
  (pages, top fives); `ContentPage.test.tsx`; the SDK's content call with a
  page.

## 2026-09-26 — Fair timing: a post starts when it is drawn, a swipe counts when it is recognised

- **A post goes live on its first drawn frame** (`useGame`: `beginReel` arms
  it, `goLive` starts it). Until React has drawn it, it stays hidden, its
  clock, timer bar, meter drain and deadline wait, and a touch is not its own
  (as during the slide). The phone's drawing time is no longer charged to the
  player's reaction — a slow phone was paying for it on every post.
- **A swipe counts the moment it is recognised** (`gesture.ts`): mid-drag,
  once the finger has gone 60 px up (or 20 px at ≥ 0,35 px/ms), or at the lift
  if only the lift makes it one — and the post leaves right then. `t` is that
  moment; it used to be the finger-down, while the post stayed until the lift.
  - The API's pace (`RunClock`) counted a swipe post as on screen for `t`
    only, so every drag was time it never saw. Honest, relaxed play drifted
    20–30 % behind the model and got **"Biraz yavaş" (`slow_timing`) reviews**
    at the 120 s and 240 s marks. Now the app and the model agree; only late
    timers and a frame per post are left. An honest phone that draws each post
    in 45 ms joins `RunVerifierTest`'s honest phones, and 80 % / 70 % speed
    games are still caught.
  - "Press first, decide while holding" no longer buys a swipe a faster `t`.
  - Engine, rules, lock, fixtures and `ENGINE_VERSION` 2 are untouched (only
    the `Action` comment in `run.ts`). The same thumb now scores about 10–19 %
    less, and its runs are 2–3 % shorter; Şimşek's 550 ms swipe limit is a
    little harder.
- **The window's end is final.** The 1.2 s drag grace is gone. When the timer
  bar runs out, a finger still on the glass is judged at once: a still press
  as a hold (wrong), anything else as a timeout. Only a gold hold that began in
  time runs on, until it is let go or can only be late.
- **A gold post's time bar hides while it is held** (`values.timerShown` →
  `ReelCard`), since its fill bar is the clock then. A hold broken in time
  brings the bar back with the time really left: it now runs on out of sight
  instead of freezing. A hold broken after the window, or after the meter ran
  dry, is judged at once.
- Docs: `docs/product/scoring.md` (new "Süre" section, `t`, checkpoints),
  `docs/design/mobile-design-system.md`.
- Tests:
  - `gesture.test.ts`: mid-drag, flick at the lift, nothing after a swipe, a
    wobbly tap.
  - `useGame.test.tsx`: new "useGame timing" block — live on its frame,
    fingers from before the frame, coach card, leaving or closing while
    drawn, still and moving fingers at the window's end, the gold hold's bar,
    past-window holds.
  - `ReelCard.test.tsx`: the time bar shown and hidden.
  - `RunVerifierTest`: the slow-drawing phone.
- **When this ships**, raise `QUEZBY_IOS_MIN_VERSION` /
  `QUEZBY_ANDROID_MIN_VERSION` to it, so no build with the old timing plays
  ranked alongside it.

## 2026-09-26 — Six languages: Türkçe, English, Deutsch, العربية, Français, Español

- **The game speaks six languages** (`docs/product/localization.md`,
  `docs/design/ui-writing.md` — each language's voice and a six-language
  glossary). Every word a player sees now lives in
  `apps/mobile/src/i18n/messages/<area>.ts`, the six side by side; Turkish is
  the source and fixes each line's shape, so a line missing in any language
  does not compile. Screens read them with `useT()`; numbers, times and lists
  go through `t.fmt` — Turkish exactly as before (`12.345`, `%94,2`, `x1,25`,
  "6 g 14 sa"), `12,345` / `94.2%` / `x1.25` in English, a no-break space in
  French, `1234` but `12.345` in Spanish, Latin digits in Arabic — and counts
  take each language's plural forms (Arabic's six). Turkish grammar that
  follows a name ("@ekin'e") stays in the Turkish lines (`i18n/grammar/tr.ts`).
  The 39 fake posts' jokes and handles are rewritten for each language
  (`packages/config` content catalog; ids, order and the API's fixtures
  unchanged). **The five translations still wait for a native speaker's read.**
- **Which language:** a first launch opens in the phone's language — the first
  of its preferred languages among the six, English for any other
  (`react-native-localize`). The welcome has a small language slab; Ayarlar's
  first row is **Dil** (`LanguageSheet`: each language in its own words and
  script). The choice is kept on the phone; a later change of the phone's own
  language (system, or the per-app setting iOS and Android 13+ now offer —
  `CFBundleLocalizations`, `localeConfig`) wins at the next launch.
- **The account keeps it:** `users.locale` (accounts from before are `tr`),
  `Me.locale`, `PUT /me/locale` → `{ user }`. An account is born with the
  request's language. A phone that sees an account for the first time — a
  sign-in with email, Apple or Google, a reinstall the keychain kept — takes
  the account's language before its screens draw; after that the phone's
  choice is written to the account (`useLanguageSync`, tried again on return
  when the network was missing). The admin panel shows it ("Dil").
- **Arabic reads right to left.** Choosing it, or leaving it, reloads the app
  (`I18nManager` + `react-native-restart`), asked first in the picker; an
  automatic turn is tried once per build and direction, so a phone that
  ignores the flags never loops. The layout mirrors itself; glyphs that point
  along the line (`MIRRORED` in `ui/icons.tsx`) and the Toggle's knob are
  turned by hand; names and `#ranks` inside Arabic lines keep their order
  between left-to-right marks (`handle()`, `iso()` — iOS ignores Unicode's
  isolates). Arabic is set in **Cairo** (OFL; SemiBold to Black,
  bundled on both platforms) with no letter-spacing (`tracking()`) and taller
  lines (`lh()`); iOS paints the arena behind a reload, never white.
- **The API answers in the request's language** (`Accept-Language`,
  `ResolveLocale` on every player route, ahead of auth and the throttles;
  the admin panel and ops stay Turkish): error and validation messages,
  username refusals and both share texts come from
  `lang/{tr,en,de,ar,fr,es}/`, numbers grouped the language's way
  (`Locale::group`, held to `packages/config/fixtures/locales.json`), Arabic
  share lines opening with an RLM. `ErrorCode` messages, `Username::MESSAGES`
  and the FormRequests' `attributes()` moved into the lang files. API tests
  pin `Accept-Language: tr` (Symfony sends `en-us` by default).
- **Contract:** `Locale`, `Me.locale`, `UpdateLocaleRequest`, admin
  `AdminPlayerRow.locale`; SDK `locale` (sent as `Accept-Language`) and
  `me.updateLocale`; `@quezby/config` `LOCALES`, `LOCALE_NAMES`, `bestLocale`,
  `groupDigits`, `decimalMark`, `pluralCategory`, `USERNAME_PROBLEMS`;
  `usernameChecklist` returns rule ids and `USERNAME_MESSAGES` is gone (the
  words are the catalogs').
- **Held in place:** ESLint refuses JSX text, copy props, Turkish letters and
  `` `@${name}` `` in `apps/mobile/src` outside `src/i18n`; catalog tests (no
  line left empty that Turkish fills, no Turkish left in another language,
  dock words that fit); `LocaleParityTest` and `LangParityTest` on the API.
- Smaller: Yardım's "sağ üstteki ayarlar" names no side any more; the delete
  confirmation accepts the name typed with its `@`, as its label shows it; a
  refused name is kept as its code and said in the language on screen; share
  texts group every number (`1.234 post`).

## 2026-09-26 — Usage analytics with consent, and the device registry

- **Analytics, self-hosted, without the bloat** (`docs/product/analytics.md`).
  The phone sums each visit up — how long the app was in front, the screens
  in order (40 steps at most) and a closed catalog of moments (shares, "Geç
  onu", the practice run's end, skipping the name or the protection, offline
  and unsent runs) — and sends it in **one request as the app goes to the
  background**, never a request per tap. `POST /analytics/visits` (≤ 10 a
  request, idempotent by the phone's visit id, clock skew corrected from
  `sentAt`, stale or unknown codes counted and dropped, 50 visits a player a
  day, 12 requests a minute) answers `{ record }`; `false` stops the app for a
  day. The API keeps three layers that stop growing: visits with journeys (30
  days), one row per player and active day (90 days), anonymous daily totals
  (for good, a few dozen rows a day) — plus a player's firsts. Counters move as
  things happen, so no job adds them up later; pruning runs by itself after a
  response at most once an hour (`defer`, one cache key), with
  `quezby:analytics:prune` and the panel's **Sistem → Analitiği temizle**
  (audited `system.analytics_prune`). No cron needed, no transaction around a
  batch (MySQL's `INSERT IGNORE` would deadlock two), and no cache file per
  player and day: "seen today" rides on Sanctum's previous `last_used_at`.
  Valves: `QUEZBY_ANALYTICS_ENABLED`, `QUEZBY_ANALYTICS_SAMPLE`.
- **Consent first** (`settings.analytics`, `users.analytics_at`): the welcome
  asks once — "Oyunu birlikte geliştirelim mi?", **İzin ver / İzin verme**
  (`ConsentCard`) — before anything is counted; a phone from before it is
  asked once in the lobby, and the league reminder waits for the answer.
  Ayarlar has **Kullanım verisi**; a no deletes the player's visits, days and
  firsts. Signing out forgets the answer on the phone. Yardım says what is
  collected. The settings store no longer resets a setting it was not given.
- **Device registry, for every player** (`player_devices`): every call names
  the phone (`X-Device`: install, platform, system, model, build — no IP); a
  token's first request of the day writes it. Ten phones a player at most,
  180 days unseen and it goes. The panel's player page lists the phones and
  the other accounts seen on each.
- **Panel:** new **Analitik** page — online now, active today / 7 / 30 days,
  stickiness, active players (returning and new), visits, minutes, weekly
  retention (day 1/3/7/14/30), the newcomers' first steps, screens, moments,
  phones by version, system and model, and what each layer holds. The player
  page gets an **Etkinlik** tab (30-day strip, latest visits with journeys,
  firsts), the phones on **Cihazlar**, and the consent under Hesap. New kit
  pieces: `RetentionTable`, `FunnelList`, `ActivityStrip`, `Journey`.
- **Contract:** `AnalyticsScreen`, `AnalyticsEvent`, `AnalyticsVisit(s…)`,
  `UserSettings.analytics`; admin `AdminAnalytics`, `AdminPlayerActivity`,
  `AdminPlayerDevice`, `AdminPlayerDetail.analyticsAt`,
  `AdminPlayerResponse.installs`, `system.analytics_prune`, `analytics-prune`;
  SDK `analytics.send`, `deviceHeader`, admin `analytics.get`,
  `players.activity`. `@quezby/config` holds the catalog and its limits
  (`fixtures/analytics.json`, held to the API's enums).
- iOS privacy manifest declares Product Interaction, Device ID and diagnostics;
  `apps/mobile/store/README.md` lists what the store labels must say.
  `AnalyticsDemoSeeder` fills the local panel (DemoSeeder calls it).

## 2026-09-26 — Staging fixes: APP_KEY, permanent names, verdict colours

- **Staging went out without `APP_KEY`** (and with `APP_ENV=local`), which
  explains two bugs at once: every checkpoint check-in answered `500`, so
  honest runs were reviewed for "Makbuz eksik" (`checkpoint_missing`, received
  0); and Apple sign-in failed after Face ID, because storing Apple's refresh
  token (an `encrypted` column) needs the key — Google stores none, so it
  worked. The key now cannot go missing quietly:
  - `scripts/check-api-env.mjs` — `package-api.sh` checks the `.env` first and
    builds nothing without a well-formed `APP_KEY`, with another `APP_ENV` or
    with debug on (Laravel's own reading of `APP_DEBUG`); an empty
    `QUEZBY_DAILY_SECRET` is a warning. It never prints a value.
  - `RequireAppKey` (API middleware): without the key every player request is
    a logged `500` before anything runs — Apple's one-time code is no longer
    spent for nothing. `/admin/*` and `/ops/*` stay open: they need no key and
    they are how it is put right. `App\Support\AppKey` says what is wrong.
  - **`AdminSystem.appKey`** (contract): the panel's Sistem page says in red
    when the key is missing, with **Önbelleği yenile** at hand.
  - `phpunit.xml` carries the suite's own key instead of leaning on a local
    `.env`. Docs: why the key must stay the same on the machine and the server,
    and never change (`APP_PREVIOUS_KEYS` does not cover receipts).
- **A lost check-in is tried again** (`useGame`): a check-in that fails on the
  network, a timeout or a `5xx` goes again at a later verdict, at least 5 s
  later, at most twice a run — three marks and two retries, never more than a
  finish carries (`CHECKPOINTS.maxReceipts`). A refused one (`4xx`, `429`) is
  not retried. The API is unchanged: a retry is sent like any check-in.
- **A username is picked once and never changes.** `PUT /me/username` writes a
  name only over the automatic one (or none): any other answers the new
  **`409 username_locked`**, the same name again stays a harmless `200`, and
  the write holds only while the name is still the one the player had, so two
  quick picks cannot both land. Picks are throttled (`username-update`, 10 a
  minute). `canPickUsername` / `Username::isPickable` share the rule. The app
  says so wherever a name is picked ("seçtiğin ad bir daha değişmez"), Ayarlar
  shows a picked name locked — "Kullanıcı adın · @ekin · kalıcı", no arrow —
  instead of "Kullanıcı adını değiştir", and Yardım answers "Kullanıcı adımı
  değiştirebilir miyim?". The panel's **Adı sıfırla** is the one way out: it
  opens exactly one more pick. Names picked before this are permanent now.
- **The panel's verdicts read at a glance**: "Mükemmel" was the brand magenta,
  a hair from the failure red. A run's strip now draws İsabet light green (a
  soft fill with a green edge), Mükemmel solid green, Erken/Geç bıraktı amber,
  failures red and Dopamin bitti grey, and its tally pills carry each cell's
  swatch as the legend. The overview's clean runs are green too.
  `docs/design/admin-design-system.md`: the action colour is never a status.

## 2026-09-25 — The admin panel

- **`apps/admin`: the game's admin panel** — a static single-page app (Vite +
  React 19 + Tailwind v4 + TanStack Query) for shared hosting, on its own
  subdomain (`admin.quezby.com`, `staging-admin.quezby.com`). Pages: Genel
  bakış (today and 30 days, the queue, the week's signals), Oyuncular (search
  by name, email, id or install; ban, unban, reset a name, sign out, delete),
  Şüpheliler (the review queue, flagged runs, suspect players by risk), Turlar
  (every run, and a run post by post as the API's engine replays it),
  Sıralamalar, Günün akışı, Ligler, İçerik (how each post fares), Denetim
  kaydı, Yöneticiler and Sistem (migrations, caches and stale runs without SSH).
- **Its look is Qesvis's admin language in Quezby's colours** — a kit written
  from scratch in `apps/admin/src/components`, tokens in
  `apps/admin/src/index.css` (magenta primary, violet accent, the game's
  gradient on every page's band, light and dark), held to the game's palette
  and to contrast by `scripts/admin-tokens.test.mjs` (with `scripts/lib/oklch.mjs`,
  now shared with `pnpm tokens`). `docs/design/admin-design-system.md`,
  `docs/rules/admin-rules.md`. Arena stays the game's alone.
- **`/api/v1/admin`** (`docs/backend/admin-api.md`): staff accounts
  (`admins`) with roles — Sahip, Moderatör, İzleyici — on their own guard:
  an admin token opens no player route and a player token no admin route;
  `config/auth.php` pins the `sanctum` guard to players. Sessions end after
  `QUEZBY_ADMIN_TOKEN_HOURS` (12); a new admin starts on a temporary password
  shown once. A role that may not gets the new **`403 forbidden`** error code.
  Every route declares its least role and `RolesTest` holds the list.
- **The audit log** (`audit_entries`) records every moderation and admin
  action with who made it, from where and why — from the panel, `php artisan`
  and the ops routes alike: `ModerationService` now takes an `Actor` and writes
  the entry in the same transaction; a ban of a banned player changes nothing.
- **`runs.flag_codes`** (`,wall_clock,reaction_cv,`) keeps a run's flag codes
  findable in any database, in step with `flags` through the `Run` model;
  `App\Enums\RunFlag` lists every code with its severity and the weight the
  suspects list gives it. Indexes on `runs.started_at`, `runs.finished_at`
  and `users.created_at`.
- The first owner: `php artisan quezby:admin:create`, or `POST /ops/admins`
  behind the ops token. Account deletion moved into `AccountDeletion`, shared
  by `DELETE /me` and the panel; the ops chores into `OpsChores`, shared by
  `/ops/*` and the system page. `config/cors.php` lets browsers remember a
  preflight for two hours.
- **`@quezby/sdk/admin`** (`createAdminClient`), on the request core now in
  `packages/sdk/src/http.ts` — the app's client is unchanged and ships none of
  it; `packages/types/src/admin.ts` is the contract. Local demo data:
  `php artisan db:seed --class=AdminDemoSeeder` (an admin per role, bots, a ban).
  Hosting: `pnpm admin:package:staging|production` → one zip with its
  `.htaccess` (SPA routing, caching, a CSP naming the API) —
  `docs/deployment/shared-hosting.md` → "Yönetim paneli".

## 2026-09-25 — First launch: a practice run, a name, a way to keep the account

- **Play first.** The welcome has one gold **Oyna** — a guest account and
  straight into a **practice run** ("DENEME TURU") — and "Hesabım var, giriş
  yap". The practice run is the real game on the phone alone: nothing reaches
  the API, nothing counts (boards, league, stats, best). Before the first post
  of each kind the feed stops for a **coach card** (`CoachCard`, a new kit
  family) whose hand acts the move out; the post's clock starts on "Anladım".
  The engine only times a reel once it is live, so the locked rules are
  untouched (`useGame`: phase `coach`, `start('tutorial')`, `unseen` kinds on
  the result).
- **Then a name, which can wait.** Every account is named at birth —
  `guest48128742` (`GuestNames`, guests and new Apple/Google players alike) —
  so "Sana ne diyelim?" has a **Şimdilik geç**. Names that look automatic
  (`guest`/`misafir` + digits) are reserved in both copies of the rules and the
  shared fixture; `isAutoUsername` / `Username::isAutomatic` tell one apart, and
  the profile says "Adını seç" for it.
- **Then keeping the account, which can wait too** — `ProtectScreen`: Apple,
  Google, "E-postayla koru" (`CredentialsSheet`, out of the profile) or "Şimdi
  değil". An Apple/Google account that is someone else's can be switched to.
  A guest is asked once more, in the lobby, the moment their league opens.
- **The league opens after 3 counted runs** (ranked and scoring,
  `leagues.unlock_runs`): `LeagueResponse.unlock` and
  `FinishRunResponse.leagueUnlock` say how many are left ("Lige 2 oyun
  kaldı"); `LeagueService::join` seats nobody before. Anyone who has ever sat
  in a league is never locked again. There is still no player level or XP.
- The first steps live in `stores/onboarding` (per account, on the phone) and
  `navigation/gate.ts` decides what mounts. `docs/product/overview.md`
  ("İlk açılış"), `usernames.md`, `scoring.md`, `api-contract.md`, the design
  docs and `ui-writing.md` carry the rules.

## 2026-09-25 — Posts, not reels

- What comes down the feed is a **post** to the player everywhere they read
  it: the how-to guide ("Sıradan post", "Altın post", "Kırmızı postta elini
  çek"), the help screen, stats labels ("Post", "Postlardan"), league and
  player rows ("64 post"), the settings line and the API's share text
  ("… 245 post · bugün #12 …"). `docs/design/ui-writing.md` has the rule; the
  code and the product docs keep *reel* as the domain term.

## 2026-09-25 — Store listing

- `apps/mobile/store/`: the App Store (Turkish, plus an optional English (U.K.)
  localization that the Turkish storefront also indexes) and Google Play
  (`tr-TR`) texts, one field per file in fastlane's `deliver` / `supply`
  layout. The README explains the keyword strategy, categories, screenshot
  captions and what is left out on purpose (other brands, price and rank
  claims).
- `scripts/store-listing.test.mjs` (run by `pnpm test`) holds them to the
  stores' limits — the App Store keyword field is 100 **bytes**, and Turkish
  letters take two — and to the brand's spelling.

## 2026-09-24 — One bundle id; the environment comes from `.env`

- iOS and Android ship one id, **`com.kubisimsek.game.quezby`** — the
  `.local` and `.staging` apps that installed side by side are gone. iOS keeps
  only Debug and Release (the `Quezby Staging` scheme and the `Staging.*`
  configurations are gone); Android has no flavors.
- `QUEZBY_ENV` in `apps/mobile/.env` picks the API. `pnpm switch-local`,
  `switch-staging` and `switch-production` (`scripts/switch-env.mjs`, tested
  with `node --test`, run by `pnpm test`) set it and write
  `ios/Config/Environment.generated.xcconfig` — the name on the home screen and
  Google's iOS URL scheme; Gradle reads `.env` itself. `pnpm ios` syncs iOS
  first, and an Xcode build stops when `.env` changed after the last switch.
- Google ids and the Play Integrity project number are one each now
  (`GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`,
  `GOOGLE_CLOUD_PROJECT_NUMBER`); only the API URLs stay per environment.
- Metro's cache is keyed on `.env`, so a switch needs only a Metro restart.
  Jest no longer reads the real `.env` (react-native-dotenv used to inline it
  into tests): `@env` is `src/types/env.mock.ts`. A `.env.local` /
  `.env.production` next to `.env` — which react-native-dotenv would merge
  over it — stops the bundle.
- API: `APPLE_BUNDLE_IDS` and `PLAY_INTEGRITY_PACKAGES` default to the one id.
- `docs/development/device-integrity-setup.md`: App Attest and Play Integrity,
  console by console.

## 2026-09-24 — Anti-cheat v3: device integrity and checkpoints

- **Device integrity.** Android proves itself with Google **Play Integrity**
  (standard requests), iOS with **App Attest** (a key attested once per install,
  then signed assertions), both against a one-time server challenge. The API
  verifies them itself (Google's decode endpoint with a service account; Apple's
  certificate chain, nonce, app id, counter) and keeps the verdict for a few
  hours per device, so it is not a per-run cost. Policy (`QUEZBY_INTEGRITY_MODE`,
  `enforce` in production): a **failing** device (rooted, emulator, changed app)
  plays but never ranks, and the result says so; an **unverifiable** one (no
  Google services, old phone, simulator, service down) ranks, with its top
  scores held for review.
- **Checkpoints against slowed-down games.** A ranked run checks in at 45 s,
  120 s and 240 s of play with the SHA-256 of its moves so far; the API signs
  the time it saw it (no database write) and, at the finish, compares real time
  with the time those moves need at the app's pace: `slow_motion` (hard),
  `slow_timing` / `checkpoint_missing` (soft), `checkpoint_forged` /
  `checkpoint_mismatch` (hard). SHA-256 in `@quezby/config` (Hermes has no
  WebCrypto) with PHP parity fixtures.
- Rules: `docs/rules/react-native-rules.md` gained the enforceable
  "Quezby looks like a game" section; CLAUDE.md and AGENTS.md point to it.

## 2026-09-24 — Arena: Quezby looks like a game

The owner found v2 still "an app, not a game". After researching how games
are drawn (Duolingo's 3D buttons, Clash Royale's and Brawl Stars' lobbies,
docks and ladders), the whole app moved to a new design language, **Arena**
(`docs/design/design-language.md`, rewritten).

- **One art direction:** a violet night lit magenta from the top with faint
  lanes (`Arena`, behind every `Screen`); no white or grey canvases; the app no
  longer follows the phone's light/dark setting. `design/palette.mjs` now has
  one flat `roles` set (`arena` in `tokens.ts`) with new roles for tiles,
  outline, lips, wells, gold, cyan time and medal rims; `pnpm tokens` refuses a
  light/dark pair.
- **Type:** Rubik Black/ExtraBold for titles, numbers and buttons (on a hard
  drop shadow) and Nunito for text, replacing Quicksand. Both carry every
  Turkish letter — checked glyph by glyph; Lilita One, Fredoka, Titan One and
  the caps-only faces games often use do not. Static Latin subsets in
  `assets/fonts`, linked for iOS and Android (native rebuild needed).
  Ribbons and tile names may be in capitals, typed with the Turkish İ.
- **Depth:** every tile and button has a dark outline and a lip; buttons are
  `Slab`s that sink into their lip under the thumb. Gold (`play`) is the one
  action that starts a game; magenta and violet do the rest.
- **No app chrome:** native navigation bars are gone (`TopBar` on the arena
  instead); the tab bar became a **dock** — Zirve · Lig · **Oyna** (a gold slab
  standing out of the middle) · **Arkadaşlar** (search and follows, now a tab)
  · Profil; chevron rows became rows with an arrow slab; the iOS switch became
  the game's toggle; sheets are dark tiles with a red close slab.
- **Lobby rebuilt:** status strip (framed portrait with the league emblem),
  "Günün akışı" on a stage with a fan of the four reels, a big breathing gold
  play slab with a glint, the league tile with its progress bar, the rival as
  a VS face-off, records in gold.
- **Juice kit:** `Stamp`, `CountUp`, `Confetti`, `useShake` — each plays once
  and stands down under reduced motion; used on the result screen.
- Every screen restyled: welcome, login, username, lobby, Zirve, Lig, Günün
  akışı, result and HUD, profile (settings moved into a sheet), Arkadaşlar,
  Yardım, player card. Tests updated and added for the new kit (slab, top
  bar, toggle, juice, dock).

## 2026-09-24 — v2: Zirve, Günün akışı, ligler, kilitli puan

- **Engine v2, locked.** Drain `55 + ⌊n/5⌋` (runs last ~2 / 3,5 / 5–6 / 7,5 min
  from casual to pro); bases 100/120/150/120; a level multiplier that climbs from
  x1 towards x3 and never reaches it; a combo of x1,00–x1,50 (+0,05 per hit, a
  miss halves what is above x1); four named combos — Kusursuz seviye, Şimşek,
  Soğukkanlı, Geri dönüş. Same skill over the same length now scores within
  ±20 % (v1: −26 %…+41 %), locked by `balance.test.ts`. `rules.lock.json` seals
  the rules and fixtures (`pnpm engine:lock` refuses a change without a
  version bump); boards are per season (= engine version). PHP twin replays
  every fixture reel by reel; rules hash identical on both sides.
- **Nothing after a run is computed on the phone.** Start sends the engine and
  content versions (old apps get `engine_outdated`); the result screen says
  "Doğrulanıyor…" and shows only the API's answer — score, breakdown per named
  combo, stats, rank changes, players passed, league standing, daily card and
  the share text the API writes. An unsent finish is kept on the phone and
  retried.
- **Anti-cheat:** one open run per player (older ones `abandoned`), lazy
  `expired`, finish throttle, a wall clock built from the app's real pace
  (`@quezby/config` PACE ↔ `config/quezby.php`), hard flags (`fast_decisions`
  at the 250 ms speed floor, `hold_bounds`, `client_mismatch`, `banned`) and
  soft signals (rhythm, floor hugging, perfect share, score jump, shared
  install) that hold only a would-be top score for `review`; calibrated so no
  simulated player of any skill is caught. Moderation: `quezby:review`,
  `quezby:run:approve|reject`, `quezby:user:ban|unban`, `quezby:runs:expire`,
  and `POST /ops/moderate` behind `MODERATION_TOKEN`.
- **Boards:** Bugün / Hafta / **Ay** / Tüm zamanlar and the daily `challenge`
  board; `endsAt` + `serverTime`, `gap` to the row above, `neighbors`, `rival`,
  `nextRankProgress`, friends scope. The **Zirve** screen: podium, climb with
  gaps, a sticky "Senin katın" card with **Geç onu**, countdowns.
- **Günün akışı:** one HMAC-seeded feed per Istanbul day for everyone, one
  attempt (unique index), counted on every board and the league, with a
  server-built Wordle-like share grid.
- **Weekly leagues:** Bronz → Elmas, 30-player groups seated on the week's
  first ranked run, points = the sum of each day's best, top/bottom five move,
  settled lazily without cron. New Lig tab.
- **Follows:** search, player cards, follow/unfollow, following/followers,
  friends boards.
- **Stats:** per-run stats from the replay, lifetime `player_stats`, and which
  feed posts were shown and liked (`content_stats`, `player_content`) — the
  content catalog moved to `@quezby/config` with stable ids and a PHP twin.
- **Sign in with Apple and Google:** nonce-bound Apple tokens, JWKS-verified
  (cached) Apple and Google ID tokens, sign-in/up, linking to a guest and
  unlinking (never the last way in), Apple grant revoked on account deletion.
  iOS entitlement, Google URL scheme and URL handler, `SocialButton`s on the
  welcome and login screens, and on Profile: **Hesabını koru** for a guest,
  **Giriş yolları** once kept (add Apple, Google or an email; **Bağı kaldır**).
  The profile's badge and "Çıkış yap" name the real ways in instead of
  assuming an email.
- **Home is a game lobby:** today's Günün akışı with the one (breathing) play
  button, league and rival cards, records strip; "Nasıl oynanır" moved to a
  new **Yardım** screen.
- **Tests:** the API suite moved to **Pest** (every existing case kept) and
  grew with a test per endpoint and service; Jest moved to React Native
  Testing Library v14 with the official Reanimated mock; the kit was split into
  `ui/kit/*` with new components (Podium, ClimbRow, FloorCard, CountdownChip,
  TierBadge, MedalBadge, BonusChip, ShareGrid, LobbyCard, StatGrid, IconButton,
  SocialButton) and palette roles for medals, tiers and sign-in buttons.

## 2026-09-24 — MVP

- Monorepo: `apps/mobile` (bare RN 0.86), `apps/api` (Laravel + Sanctum),
  `packages/engine`, `config`, `types`, `sdk`, `tsconfig`.
- Engine v1: four reels (skip, like, hold, freeze), hyperbolic difficulty
  curves, ever-faster dopamine drain, level × combo scoring, deterministic
  xorshift32 feed, replay + parity fixtures, balancing simulator.
- Server-side run verification: seeded runs, PHP replay, wall-clock and
  reaction-time plausibility, flagged runs kept off the boards.
- Daily / weekly / all-time leaderboards in Europe/Istanbul with tie-breaks.
- Guest-first accounts (keychain token), unique usernames (a–z 0–9 . *,
  symbols never touching), optional email + password, in-app deletion.
- Three environments: bundle ids `.local` / `.staging` / production, iOS
  configurations + schemes, Android flavors, Laravel env templates and a
  shared-hosting zip packager.
- "Akış" design language derived from Qesvis "Sefer": generated OKLCH tokens,
  kit, sheets, icon set with game glyphs, haptics.
- Verified on the iOS simulator end to end (guest → username → runs →
  server replay → leaderboards → profile, light and dark) and an Android
  `localDebug` build. Fixes from that pass: a gesture the JS thread reached
  after the reel's window now counts as a timeout instead of throwing; the
  `/me` cache no longer overwrites a fresher session (`rememberMe`); the
  username box is uncontrolled; runs that scored nothing stay off the boards;
  Android flavors list their `debuggableVariants`.
- App icon (`apps/mobile/design/make-icons.py`) and branded launch screens.
