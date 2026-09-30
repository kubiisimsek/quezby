# Quezby — UI writing

The game speaks eight languages — Türkçe, English, Deutsch, العربية,
Français, Español, 日本語, 한국어 — informally, in sentence case, with capitals
kept for the game's ribbons (see Rules). **Turkish is the source:** every line
is written in Turkish first and in the other seven in the same change, with
the words below. The seven translations have not been read by native speakers
yet
(`docs/product/localization.md` tracks it).

Every line lives in `apps/mobile/src/i18n/messages/<area>.ts`, one file per
area of the game with the eight languages side by side. A line with a number, a
name or grammar in it is a function in every language — never two lines glued
into a sentence.

Two kinds of words live elsewhere, in the eight languages too. What a push
notification says is the API's, in the receiver's language:
`apps/api/lang/{locale}/push.php`, and the phrases friends send in
`phrases.php` (the same lines as `messages/inbox.ts`). The phone's own
system words are native files: iOS's reasons for the photo library and the
camera (`ios/Quezby/<lang>.lproj/InfoPlist.strings`) and Android's
notification channel (`android/app/src/main/res/values-<lang>/strings.xml`,
English in `values/`).

## Two registers

| Where | Voice | Examples |
| --- | --- | --- |
| Inside a run | Short, cheeky, one or two words — read in a glance | "Takıldın!", "Yanlış hareket", "Erken bıraktın", "Yakalandın!", "Mükemmel!", "Dopamin bitti" |
| Around the game | Plain, warm, exact | "Bu kullanıcı adı alınmış.", "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et." |

Game words are welcome here (seviye, kombo, seri, rekor) — Quezby is a game.
Captions on reels are jokes and may be silly; nothing else may be. A caption is
not translated word for word: each language gets a joke that lands in it.

## Each language's voice

| Language | Speaks to the player as | Notes |
| --- | --- | --- |
| Türkçe | *sen* | Ribbons typed in capitals with **İ** (and **I** for ı) |
| English | *you*, with contractions ("You're", "Don't") | American spelling |
| Deutsch | *du* | Nouns capitalised as German wants; in ribbons ß is written **SS** (the fonts have no ẞ) |
| Français | *tu* | A no-break space (U+00A0) before `! ? : ; %` and inside « » |
| Español | *tú* | Neutral Spanish: no *vosotros*, no *vos*, no regional words; ¡ and ¿ open |
| العربية | Modern Standard Arabic, the singular masculine as everyone's *you* | No capitals, no letter-spacing, Latin digits; see "Arabic" below |
| 日本語 | Friendly です/ます; game moments may go casual (「〜しよう！」) | Full-width punctuation 、。！？; no capitals; see "Japanese and Korean" below |
| 한국어 | 해요체 ("〜해요", "〜하세요"), never 반말 | Latin punctuation with normal spacing; no capitals; see "Japanese and Korean" below |

## The game's own words

| Word | Use |
| --- | --- |
| **Post** | What comes down the feed, as the player sees it: "Sıradan post", "Altın post", "Kırmızı postta elini çek", "64 post". Never "reel" in the app, the share text or the store — the code and the product docs keep *reel* as the domain term |
| **Günün akışı** (#17) | The daily challenge: "Herkes aynı akışı oynar · tek hak" |
| **Mod seç** · **Günlük · Normal · Dereceli** | The sheet the gold slab opens, and its three modes. Normal is any number of runs ("Normal oyun" in the history, "Normal oyna" on a button); Dereceli is the only one that plays for qb ("qb için oyna"), shut until "Dereceli’ye 12 oyun kaldı", then "Dereceli açıldı!". Never "Serbest oyun", "rekabetçi" or "ranked" in Turkish; the slab itself still just says "Oyna" |
| **Zirve** | The leaderboard screen and its dock slot; **Senin katın** is the player's own row card |
| **Oyna · Zirve · Lig · Mesajlar · Profil** | The dock's five slots, the lobby (Oyna) in the middle |
| **SEZON REKORU** · **Yukarı kaydır, oyna** | The lobby is a lock screen: the season best stands where the time would ("SEZON REKORU"), and the line under the gold slab says what a lock screen says, as the game's own move. Tapping plays too |
| **SENİ BEKLEYEN VS** · **@deniz sana VS attı** · **+2 VS daha** | A VS waiting for you, as a notice on the lobby: ✓ and ✗ are read aloud as **Kabul et** and **Reddet**; past three, the rest are counted on the way to Mesajlar |
| **Mesajlar** · **Mesajlar / Arkadaşlar** | The dock's social slot and its screen, split by a switch: the conversations, and the friends — the search, the requests, the list. Empty conversations: "Henüz mesajın yok" |
| **Bildirimler** (the bell) | The lobby's bell and its list: "@mert sana arkadaşlık isteği gönderdi", "@ada isteğini kabul etti", "@deniz sana VS attı", "@oya ile VS’i kazandın / kaybettin", "… berabere bitti", "@deniz VS’ini reddetti", "@deniz VS’ine zamanında bakmadı"; ribbons ARKADAŞLIK İSTEĞİ, YENİ ARKADAŞ, VS, VS SONUCU. Empty: "Henüz bildirim yok". Ayarlar → **Bildirimler** is the other one: which pushes the phone gets |
| **Arkadaşlar** | A friend list: yours, from the Arkadaş counter on your profile — the requests waiting (**İstekler**) first, then your friends A to Z — or a friend's, from the count on their card. Anyone else's is locked: "Bu liste kilitli" · "@deniz ile arkadaş olunca listesini görürsün." A friend is a player who accepted your **arkadaşlık isteği**, or whose request you accepted |
| **Arkadaş bul** · **Ekle** · **Geri al** · **Kabul et** / **Reddet** · **Sohbet** | Finding a player by the start of their name, and the one slab beside them by what they are to you; on their card the first is "Arkadaş ekle". Requests waiting for you are **İstekler**, yours "Gönderdiğin istekler" |
| **Mesaj kutusu** · **Hazır mesajlar** | The conversations (the Mesajlar slot's screen), and what friends say in them. Friends talk only in phrases from a fixed list ("İyi oyundu! 👏", "Rövanş? 🔥", `PHRASES` in `@quezby/config`): nothing a player types ever reaches another. A new phrase is a new code — codes are only added, never renamed — with a line in every language, in the app and in the API alike |
| **VS** · **VS at** | A challenge between two friends: "Aynı akış; ikinize de birer hak." Whoever sends it plays first and their score stays hidden until the friend plays; "VS hiçbir sıralamaya, lige ya da istatistiğe yazılmaz." Arabic says تحدٍّ |
| **KAZANDIN!** · **KAYBETTİN** · **BERABERE** · **Rövanş** · **Mesajlara dön** | A VS's end, stamped in Rubik, then another VS with the same friend or back to the conversation |
| **Arkadaşlıktan çıkar** · **Engelle** · **Engeli kaldır** | The first two wait under a card's "Diğer", each saying what goes with it: "Mesajlarınız silinir, açık VS’iniz kapanır." · "Arkadaşlığınız ve istekleriniz biter; seni bulamaz, sana yazamaz." **Engeli kaldır** is the card's one action for a player you blocked, and Ayarlar lists them under **Engellenenler** |
| **Bildir** | "Fotoğrafı bildir", "Kullanıcı adını bildir" — a player's photo and name are all another can report — with its promise: "Bir moderatör bakar; kimin bildirdiği söylenmez." |
| **Profil fotoğrafı** · **Galeriden seç** · **Fotoğrafı kaldır** | The portrait's photo: "Kare olarak kırparsın; herkes görür." Taken away: "Yerine baş harflerin görünür." |
| **Geçmiş oyunlar** (GEÇMİŞ OYUNLAR) | Every run played to its end, "Oynadığın her tur, sunucunun saydığı haliyle": Hepsi / Günün akışı / VS, the days as Bugün, Dün, then the date; the season's best is tagged **REKOR** |
| **Bildirimler** · **Haberin olsun mu?** · **Bildirimleri aç** | Push notifications: the new player's step after the name ("Şimdi değil" leaves them off), the card wherever they are off ("Bildirimler kapalı" — **Ayarları aç** once only the phone's settings can turn them on, **Gizle** for a week) and Ayarlar → Bildirimler (Arkadaşlık, VS, Hazır mesajlar) |
| **Geç onu** | The one action on a rival: play to pass them. "@ekin'e 1.240 puan" |
| **Bronz, Gümüş, Altın, Platin, Elmas, MasterClass** | Leagues, capitalised as names: "Altın lig"; MasterClass is written the same in every Latin language (ماستر كلاس in Arabic) |
| **qb** · **Hedef 88.400** · **+42 / −18** | The rating a league comes from. Underneath it is an Elo rating, but a player never reads "Elo", in any language: it is **qb**, with the qb coin (`QbCoin`) or the `qb` icon beside the number ("2.340" by the coin, "2.340 qb" where there is none). The score the next run has to beat, "Hedef …" — never "eşik" or "minimum"; a move with its sign and a real minus (−), ±0 for none. "Altın'a 158 qb" to the next league, "Tavanı yok" in MasterClass |
| **Yerleşme 2/3** (YERLEŞME) | The first three rated runs, which place a player: "İlk 3 dereceli oyunun hangi ligde başlayacağını belirler." Never "kalibrasyon" |
| **Yükseldin! · düştün · Kalkan · Hükmen yenilgi** | The qb tile: "Altın'a yükseldin!", "Gümüş'e düştün.", "Kalkan seni ligde tuttu", a run flagged for how it was played is "Hükmen yenilgi" — never "hile" |
| **Lig sıralaması** (LİG SIRALAMASI) · **@deniz'e 40 qb** | A league's players by qb, never reset: those who played Dereceli in the last 14 days; your floor says the qb to pass the player above. There are no weekly groups, zones or qb bonuses any more |
| **Kusursuz seviye!, Şimşek!, Soğukkanlı!, Geri dönüş!** | Named combos, as in-run toasts (with "!") and as plain names on the result |
| **Kombo x1,25** | Always two decimals, the language's decimal mark |
| **Doğrulanıyor…** | While the API replays a run — no number before it answers |
| **Skorun inceleniyor** | A held top score; never "şüpheli" or "hile" to the player |
| **Oyna** | The welcome's one slab: the practice run, before any account |
| **Giriş yap** · **Şifremi unuttum** · **Hesabın yok mu? Kayıt ol** · **Misafir olarak devam et** | The ways in after the practice run (and after signing out), top to bottom: email and password with "Şifremi unuttum" under them, the way to a new account, "ya da", **Apple ile devam et / Google ile devam et**, a guest |
| **Kayıt ol** · **Şifreyi doğrula** · **Bu e-postayla bir hesabın var.** | A new email account: the password twice ("Şifreler aynı değil." when they differ); an email that has an account leads back to **Giriş yap** |
| **E-postanı doğrula** · **Doğrula** · **Kodu tekrar gönder (0:42)** | The six-digit code: "… adresine 6 haneli bir kod gönderdik.", "Gelmediyse gereksiz klasörüne bak.", the clock counting the wait down; "Kod hatalı. Tekrar dene." / "Kodun süresi doldu. Yeni kod iste." Never "OTP" or "doğrulama linki" to the player |
| **Deneme turu** (DENEME TURU) | A new player's first run: coached, played on the phone, counted nowhere — "Bu tur hiçbir yere sayılmadı." Its score is the "deneme puanı". Never "tutorial" to the player |
| **YENİ POST · 2/4** · **Anladım** | A coach card's ribbon, and the gold slab that starts the post it explained |
| **Sana ne diyelim?** · **Şimdilik geç** | The name, right after signing in with Apple, Google or an email while the account's name is still the automatic one, and the way past it; until then the account is `@guest48128742` ("Şimdilik adın @guest48128742"). A guest is never asked |
| **Adını seç** | The name door on Hesap bilgileri while the name is still the automatic one ("Şimdilik @guest48128742 · bir kez seçersin"). A picked name never changes, so after the pick Hesap bilgileri only shows it, locked: "Kullanıcı adın · @ekin · kalıcı" — never "değiştir" |
| **Hesap bilgileri** | Ayarlar's account door, right above **Çıkış yap** ("@ekin · Apple bağlı", a guest's "Misafir hesap"), and its page: **Kullanıcı adı**, **Bağlı hesaplar**, and **Hesabı sil** last, in red |
| **Rekor · Arkadaş · Tur** · **İSTATİSTİKLER** | The three numbers under a profile's name (Arkadaş opens the friend list and wears the requests waiting), and the tile with four more whose sheet has all of them: **Oyun**, **Hareketler**, **En iyiler** |
| **Seçtiğin ad bir daha değişmez** | Said wherever a name is picked, before it is saved — there is no confirm step |
| **Dereceli’ye 2 oyun kaldı** · **Dereceli açıldı!** | Dereceli before a new player's first 20 counted Normal or Günlük runs: "Dereceli, 20 Normal ya da Günlük oyundan sonra açılır."; the run that opens it: "Dereceli açıldı!" and "İlk 3 dereceli oyunun qb’ni belirler." Before placement the league screen says "Lig sıralaması Dereceli oyuncularının" |
| **Hesabını koru** | Attach Apple, Google or an email to a guest account — on the profile, and once, when a guest's league opens ("Ligdesin!…"; "Şimdi değil" closes it) |
| **Oyunu birlikte geliştirelim mi?** · **İzin ver / İzin verme** | The one question about usage analytics (ribbon "SENİN SEÇİMİN"), a new account's step before notifications — and once in the lobby of a phone that predates it. Two slabs of one size, neither gold. It says what is counted ("hangi ekranlara girdiğini ve ne kadar oynadığını sayarız") and what never leaves the phone ("Adın, e-postan ya da konumun gönderilmez") |
| **Kullanım verisi** | The switch in Ayarlar for that answer: on — "Hangi ekranlara girdiğini ve ne kadar oynadığını sayarız."; off — "Yalnızca oyunun çalışması için gereken cihaz bilgisi gider." Never "izleme", "takip" or "tracking" to the player |
| **Dil** | The language row in Ayarlar and the small button on the welcome: the eight languages, each in its own words ("Türkçe", "English", "Deutsch", "العربية", "Français", "Español", "日本語", "한국어") |
| **Giriş yolları** | The same place once the account is kept: what is attached, **Bağı kaldır** to take Apple or Google off. On Hesap bilgileri the same tiles stand under **Bağlı hesaplar** |

## The same words in eight languages

Use these and nothing else for them. A ribbon's capitals are in brackets.

| Türkçe | English | Deutsch | Français | Español | العربية | 日本語 | 한국어 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| post | post | Post | post | post | منشور | 投稿 | 게시물 |
| Sıradan post | Plain post | Normaler Post | Post banal | Post normal | منشور عادي | ふつうの投稿 | 일반 게시물 |
| Arkadaşın (the pink post's badge) | Your friend | Dein Freund | Ton ami | Tu amigo | صديقك | 友だちの投稿 | 친구 게시물 |
| Altın post | Gold post | Gold-Post | Post doré | Post dorado | منشور ذهبي | ゴールド投稿 | 골드 게시물 |
| Kırmızı post · Dokunma! | Red post · Don't touch! | Roter Post · Nicht berühren! | Post rouge · Touche pas ! | Post rojo · ¡No toques! | منشور أحمر · لا تلمس! | 赤い投稿 · さわらないで！ | 빨간 게시물 · 건드리지 마세요! |
| Günün akışı (GÜNÜN AKIŞI) | Daily Feed (DAILY FEED) | Tages-Feed (TAGES-FEED) | Fil du jour (FIL DU JOUR) | Feed del día (FEED DEL DÍA) | خلاصة اليوم | 今日のフィード | 오늘의 피드 |
| Günlük · Normal · Dereceli | Daily · Normal · Ranked | Täglich · Normal · Gewertet | Quotidien · Normal · Classé | Diario · Normal · Competitivo | يومي · عادي · مصنَّف | デイリー · ノーマル · ランク戦 | 데일리 · 일반 · 랭크전 |
| Normal oyun · Dereceli oyun | Normal game · Ranked game | Normales Spiel · Gewertetes Spiel | Partie normale · Partie classée | Partida normal · Partida competitiva | مباراة عادية · مباراة مصنَّفة | ノーマル · ランク戦 | 일반 게임 · 랭크전 |
| Oyna · Zirve · Lig · Mesajlar · Profil | Play · Summit · League · Messages · Profile | Spielen · Gipfel · Liga · Chats · Profil | Jouer · Sommet · Ligue · Messages · Profil | Jugar · Cumbre · Liga · Mensajes · Perfil | العب · القمة · الدوري · الرسائل · الملف | プレイ · トップ · リーグ · メッセージ · プロフィール | 플레이 · 정상 · 리그 · 메시지 · 프로필 |
| SEZON REKORU · Yukarı kaydır, oyna | SEASON RECORD · Swipe up to play | SAISONREKORD · Nach oben wischen und spielen | RECORD DE LA SAISON · Glisse vers le haut pour jouer | RÉCORD DE LA TEMPORADA · Desliza hacia arriba para jugar | الرقم القياسي للموسم · اسحب للأعلى والعب | シーズンベスト · 上にスワイプしてプレイ | 시즌 최고 기록 · 위로 밀어서 플레이 |
| SENİ BEKLEYEN VS · @deniz sana VS attı | VS WAITING FOR YOU · @deniz sent you a VS | EIN VS WARTET AUF DICH · @deniz hat dir ein VS geschickt | UN VS T’ATTEND · @deniz t’a lancé un VS | UN VS TE ESPERA · @deniz te mandó un VS | تحدٍّ بانتظارك · ‎@deniz‎ أرسل لك تحديًا | 届いたVS · @denizからVSが届きました | 나를 기다리는 VS · @deniz 님이 VS를 보냈어요 |
| Arkadaşlar · Bu liste kilitli | Friends · This list is locked | Freunde · Diese Liste ist gesperrt | Amis · Cette liste est verrouillée | Amigos · Esta lista está bloqueada | الأصدقاء · هذه القائمة مقفلة | フレンド · このリストは非公開です | 친구 · 비공개 목록이에요 |
| Rekor · Arkadaş · Tur | Record · Friends · Runs | Rekord · Freunde · Runden | Record · Amis · Parties | Récord · Amigos · Partidas | الرقم القياسي · الأصدقاء · الجولات | 最高記録 · フレンド · プレイ数 | 최고 기록 · 친구 · 게임 수 |
| Hesap bilgileri · Kullanıcı adı · Bağlı hesaplar | Account info · Username · Linked accounts | Kontoinfos · Benutzername · Verknüpfte Konten | Infos du compte · Nom d’utilisateur · Comptes liés | Datos de la cuenta · Nombre de usuario · Cuentas vinculadas | معلومات الحساب · اسم المستخدم · الحسابات المرتبطة | アカウント情報 · ユーザー名 · 連携中のアカウント | 계정 정보 · 사용자 이름 · 연결된 계정 |
| Bildirimler (the bell) · Henüz bildirim yok | Notifications · No notifications yet | Mitteilungen · Noch keine Mitteilungen | Notifications · Pas encore de notifications | Notificaciones · Aún no hay notificaciones | الإشعارات · لا إشعارات بعد | 通知 · まだ通知はありません | 알림 · 아직 알림이 없어요 |
| @deniz sana VS attı · @oya ile VS’i kazandın | @deniz sent you a VS · You won the VS with @oya | @deniz hat dir ein VS geschickt · Du hast das VS gegen @oya gewonnen | @deniz t’a lancé un VS · Tu as gagné le VS contre @oya | @deniz te mandó un VS · Ganaste el VS contra @oya | ‎@deniz‎ أرسل لك تحديًا · فزت في التحدي مع ‎@oya‎ | @denizからVSが届きました · @oyaとのVSに勝ちました | @deniz 님이 VS를 보냈어요 · @oya 님과의 VS에서 이겼어요 |
| Senin katın (SENİN KATIN) | Your floor (YOUR FLOOR) | Deine Etage (DEINE ETAGE) | Ton étage (TON ÉTAGE) | Tu piso (TU PISO) | طابقك | あなたのフロア | 내 층 |
| Geç onu | Pass them | Überholen | Dépasser | Superar | تجاوزه | 追い抜く | 추월하기 |
| Bronz · Gümüş · Altın · Platin · Elmas | Bronze · Silver · Gold · Platinum · Diamond | Bronze · Silber · Gold · Platin · Diamant | Bronze · Argent · Or · Platine · Diamant | Bronce · Plata · Oro · Platino · Diamante | البرونز · الفضة · الذهب · البلاتين · الماس | ブロンズ · シルバー · ゴールド · プラチナ · ダイヤモンド | 브론즈 · 실버 · 골드 · 플래티넘 · 다이아몬드 |
| Altın lig | Gold league | Gold-Liga | Ligue Or | Liga Oro | دوري الذهب | ゴールドリーグ | 골드 리그 |
| MasterClass | MasterClass | MasterClass | MasterClass | MasterClass | ماستر كلاس | マスタークラス | 마스터클래스 |
| qb · Hedef · Yerleşme (YERLEŞME) | qb · Target · Placement (PLACEMENT) | qb · Ziel · Einstufung (EINSTUFUNG) | qb · Objectif · Placement (PLACEMENT) | qb · Objetivo · Clasificación (CLASIFICACIÓN) | qb · الهدف · التصنيف الأولي | qb · 目標 · 認定戦 | qb · 목표 · 배치고사 |
| Hükmen yenilgi · Kalkan | Forfeit · Shield | Kampflos verloren · Schild | Défaite par forfait · Bouclier | Derrota por abandono · Escudo | خسارة بالانسحاب · درع | 不戦敗 · シールド | 몰수패 · 보호막 |
| Lig sıralaması (LİG SIRALAMASI) | League ranking (LEAGUE RANKING) | Liga-Rangliste (LIGA-RANGLISTE) | Classement de la ligue (CLASSEMENT DE LA LIGUE) | Tabla de la liga (TABLA DE LA LIGA) | ترتيب الدوري | リーグランキング | 리그 순위 |
| Kusursuz seviye! · Şimşek! · Soğukkanlı! · Geri dönüş! | Flawless level! · Lightning! · Cool head! · Comeback! | Makelloses Level! · Blitz! · Eiskalt! · Comeback! | Niveau parfait ! · Éclair ! · Sang-froid ! · Remontada ! | ¡Nivel perfecto! · ¡Relámpago! · ¡Sangre fría! · ¡Remontada! | مستوى مثالي! · برق! · أعصاب باردة! · عودة قوية! | ノーミスクリア！ · 電光石火！ · 冷静沈着！ · 大逆転！ | 무결점 레벨! · 번개! · 평정심! · 대역전! |
| İsimli kombolar | Named combos | Spezialkombos | Combos spéciaux | Combos especiales | الكومبو الخاصة | 特別コンボ | 특별 콤보 |
| Sezon rekoru · Mükemmel · Tur (stats) | Season record · Perfect · Runs | Saisonrekord · Perfekt · Runden | Record de la saison · Parfait · Parties | Récord de la temporada · Perfecto · Partidas | الرقم القياسي للموسم · مثالي · الجولات | シーズンベスト · パーフェクト · プレイ数 | 시즌 최고 기록 · 퍼펙트 · 게임 수 |
| kombo · seviye · rekor | combo · level · record | Kombo · Level · Rekord | combo · niveau · record | combo · nivel · récord | كومبو · مستوى · رقم قياسي | コンボ · レベル · 記録 | 콤보 · 레벨 · 기록 |
| YENİ REKOR! | NEW RECORD! | NEUER REKORD! | NOUVEAU RECORD ! | ¡NUEVO RÉCORD! | رقم قياسي جديد! | 新記録！ | 신기록! |
| Dopamin · Dopamin bitti | Dopamine · Out of dopamine | Dopamin · Dopamin leer | Dopamine · Plus de dopamine | Dopamina · Sin dopamina | الدوبامين · نفد الدوبامين | ドーパミン · ドーパミン切れ | 도파민 · 도파민 고갈 |
| puan | points (pts where tight) | Punkte | points (pts) | puntos | نقطة · نقاط | ポイント (pt) | 점 |
| oyun (one round played) | game | Spiel | partie | partida | مباراة | ゲーム | 게임 |
| Doğrulanıyor… | Verifying… | Wird geprüft… | Vérification… | Verificando… | جارٍ التحقق… | 確認中… | 확인 중… |
| Skorun inceleniyor | Your score is being reviewed | Dein Score wird geprüft | Ton score est en cours de vérification | Tu puntuación está en revisión | نتيجتك قيد المراجعة | スコアを確認しています | 점수를 검토하고 있어요 |
| Deneme turu (DENEME TURU) | Practice run (PRACTICE RUN) | Proberunde (PROBERUNDE) | Partie d'essai (PARTIE D'ESSAI) | Ronda de práctica (RONDA DE PRÁCTICA) | جولة تجريبية | 練習プレイ | 연습 게임 |
| YENİ POST · Anladım | NEW POST · Got it | NEUER POST · Verstanden | NOUVEAU POST · Compris | POST NUEVO · Entendido | منشور جديد · فهمت | 新しい投稿 · わかった | 새 게시물 · 알겠어요 |
| E-posta · Şifre · Giriş yap | Email · Password · Sign in | E-Mail · Passwort · Anmelden | E-mail · Mot de passe · Se connecter | Correo · Contraseña · Iniciar sesión | البريد الإلكتروني · كلمة المرور · تسجيل الدخول | メールアドレス · パスワード · ログイン | 이메일 · 비밀번호 · 로그인 |
| Kayıt ol · Şifreyi doğrula | Sign up · Confirm password | Registrieren · Passwort bestätigen | S'inscrire · Confirme le mot de passe | Registrarse · Confirma la contraseña | إنشاء حساب · تأكيد كلمة المرور | 新規登録 · パスワード（確認） | 회원가입 · 비밀번호 확인 |
| Şifremi unuttum | Forgot password? | Passwort vergessen? | Mot de passe oublié ? | ¿Olvidaste tu contraseña? | نسيت كلمة المرور؟ | パスワードを忘れた？ | 비밀번호를 잊으셨나요? |
| E-postanı doğrula · Kod · Kodu tekrar gönder | Verify your email · Code · Send the code again | Bestätige deine E-Mail · Code · Code erneut senden | Confirme ton e-mail · Code · Renvoyer le code | Verifica tu correo · Código · Reenviar el código | أكّد بريدك الإلكتروني · الرمز · أعد إرسال الرمز | メールを確認 · コード · コードを再送 | 이메일 인증 · 코드 · 코드 다시 보내기 |
| Misafir olarak devam et | Continue as guest | Als Gast weiterspielen | Continuer en invité | Continuar como invitado | المتابعة كضيف | ゲストで続ける | 게스트로 계속하기 |
| Apple ile devam et · Google ile devam et | Continue with Apple · Continue with Google | Mit Apple fortfahren · Weiter mit Google | Continuer avec Apple · Continuer avec Google | Continuar con Apple · Continuar con Google | المتابعة باستخدام Apple · المتابعة باستخدام Google | Appleで続ける · Googleで続行 | Apple로 계속하기 · Google로 계속하기 |
| Sana ne diyelim? · Şimdilik geç | What should we call you? · Skip for now | Wie sollen wir dich nennen? · Erst mal überspringen | On t'appelle comment ? · Passer pour l'instant | ¿Cómo te llamamos? · Saltar por ahora | بماذا نناديك؟ · تخطَّ الآن | なんて呼べばいい？ · あとで | 뭐라고 부를까요? · 나중에 하기 |
| Adını seç | Pick your name | Wähle deinen Namen | Choisis ton nom | Elige tu nombre | اختر اسمك | 名前を決める | 이름 정하기 |
| Seçtiğin ad bir daha değişmez | The name you pick never changes | Dein gewählter Name bleibt für immer | Le nom choisi ne change plus jamais | El nombre que elijas no cambia nunca | الاسم الذي تختاره لن يتغيّر أبدًا | 選んだ名前はあとから変更できません | 고른 이름은 다시 바꿀 수 없어요 |
| Dereceli’ye 2 oyun kaldı | 2 games to Ranked | Noch 2 Spiele bis Gewertet | Encore 2 parties avant le mode classé | Faltan 2 partidas para Competitivo | مباراتان للوصول إلى المصنَّف | ランク戦まであと2ゲーム | 랭크전까지 2판 남았어요 |
| Hesabını koru · Şimdi değil · Ligdesin! | Protect your account · Not now · You're in the league! | Konto sichern · Nicht jetzt · Du bist in der Liga! | Protège ton compte · Pas maintenant · Tu es dans la ligue ! | Protege tu cuenta · Ahora no · ¡Estás en la liga! | احمِ حسابك · ليس الآن · أنت في الدوري! | アカウントを守る · あとで · リーグに参加中！ | 계정 보호하기 · 나중에 · 리그에 들어왔어요! |
| Giriş yolları · Bağı kaldır | Sign-in methods · Unlink | Anmeldewege · Verknüpfung lösen | Moyens de connexion · Dissocier | Métodos de acceso · Desvincular | طرق تسجيل الدخول · إلغاء الربط | ログイン方法 · 連携を解除 | 로그인 방법 · 연결 해제 |
| Oyunu birlikte geliştirelim mi? · İzin ver · İzin verme | Shall we improve the game together? · Allow · Don't allow | Wollen wir das Spiel gemeinsam verbessern? · Erlauben · Nicht erlauben | On améliore le jeu ensemble ? · Autoriser · Refuser | ¿Mejoramos el juego juntos? · Permitir · No permitir | هل نطوّر اللعبة معًا؟ · السماح · عدم السماح | 一緒にゲームをよくしませんか？ · 許可する · 許可しない | 함께 게임을 더 좋게 만들어 볼까요? · 허용 · 허용 안 함 |
| Kullanım verisi | Usage data | Nutzungsdaten | Données d'utilisation | Datos de uso | بيانات الاستخدام | 利用データ | 사용 데이터 |
| Bu hafta · Bu ay · Tüm zamanlar | This week · This month · All time | Diese Woche · Dieser Monat · Allzeit | Cette semaine · Ce mois-ci · Depuis toujours | Esta semana · Este mes · Histórico | هذا الأسبوع · هذا الشهر · كل الأوقات | 今週 · 今月 · 全期間 | 이번 주 · 이번 달 · 전체 기간 |
| Bugün · Dün (a past game's day) | Today · Yesterday | Heute · Gestern | Aujourd’hui · Hier | Hoy · Ayer | اليوم · أمس | 今日 · 昨日 | 오늘 · 어제 |
| Herkes · Arkadaşlar | Everyone · Friends | Alle · Freunde | Tous · Amis | Todos · Amigos | الجميع · الأصدقاء | みんな · フレンド | 전체 · 친구 |
| Arkadaş ekle · Kabul et · Reddet · Geri al · Sohbet | Add friend · Accept · Decline · Undo · Chat | Als Freund hinzufügen · Annehmen · Ablehnen · Zurückziehen · Chat | Ajouter en ami · Accepter · Refuser · Annuler · Discuter | Añadir amigo · Aceptar · Rechazar · Deshacer · Chat | أضف صديقًا · اقبل · ارفض · تراجع · محادثة | フレンド追加 · 承認 · 拒否 · 取り消し · チャット | 친구 추가 · 수락 · 거절 · 취소 · 채팅 |
| arkadaşlık isteği · İstekler | friend request · Requests | Freundschaftsanfrage · Anfragen | demande d'ami · Demandes | solicitud de amistad · Solicitudes | طلب صداقة · الطلبات | フレンド申請 · 申請 | 친구 요청 · 요청 |
| Mesaj kutusu · Hazır mesajlar | Inbox · Quick messages | Postfach · Schnellnachrichten | Boîte de réception · Messages rapides | Buzón · Mensajes rápidos | صندوق الرسائل · رسائل سريعة | メッセージ · 定型メッセージ | 메시지함 · 빠른 메시지 |
| VS · VS at | VS · Send VS | VS · VS schicken | VS · Lancer un VS | VS · Mandar VS | تحدٍّ · أرسل تحديًا | VS · VSを送る | VS · VS 보내기 |
| KAZANDIN! · KAYBETTİN · BERABERE | YOU WON! · YOU LOST · DRAW | GEWONNEN! · VERLOREN · UNENTSCHIEDEN | GAGNÉ ! · PERDU · MATCH NUL | ¡GANASTE! · PERDISTE · EMPATE | فزت! · خسرت · تعادل | 勝ち！ · 負け · 引き分け | 승리! · 패배 · 무승부 |
| Rövanş · Mesajlara dön | Rematch · Back to chat | Revanche · Zurück zum Chat | Revanche · Retour à la discussion | Revancha · Volver al chat | مباراة ثأر · عد إلى المحادثة | リベンジ · チャットに戻る | 재대결 · 채팅으로 돌아가기 |
| Arkadaşlıktan çıkar · Engelle · Engeli kaldır · Engellenenler | Remove friend · Block · Unblock · Blocked players | Als Freund entfernen · Blockieren · Blockierung aufheben · Blockierte Spieler | Retirer des amis · Bloquer · Débloquer · Joueurs bloqués | Eliminar de amigos · Bloquear · Desbloquear · Bloqueados | أزل من الأصدقاء · احظر · ألغِ الحظر · المحظورون | フレンド解除 · ブロック · ブロック解除 · ブロック中 | 친구 삭제 · 차단 · 차단 해제 · 차단한 플레이어 |
| Fotoğrafı bildir · Kullanıcı adını bildir | Report photo · Report username | Foto melden · Benutzernamen melden | Signaler la photo · Signaler le nom d'utilisateur | Denunciar la foto · Denunciar el nombre de usuario | أبلغ عن الصورة · أبلغ عن اسم المستخدم | 写真を通報 · ユーザー名を通報 | 사진 신고 · 사용자 이름 신고 |
| Profil fotoğrafı · Galeriden seç · Fotoğrafı kaldır | Profile photo · Choose from library · Remove photo | Profilfoto · Aus der Mediathek wählen · Foto entfernen | Photo de profil · Choisir dans la galerie · Retirer la photo | Foto de perfil · Elegir de la galería · Quitar la foto | صورة الملف الشخصي · اختر من المعرض · أزل الصورة | プロフィール写真 · ライブラリから選ぶ · 写真を削除 | 프로필 사진 · 앨범에서 선택 · 사진 삭제 |
| Geçmiş oyunlar (GEÇMİŞ OYUNLAR) | Past games (PAST GAMES) | Vergangene Spiele (VERGANGENE SPIELE) | Parties passées (PARTIES PASSÉES) | Partidas anteriores (PARTIDAS ANTERIORES) | الألعاب السابقة | 過去のゲーム | 지난 게임 |
| Bildirimler · Bildirimleri aç | Notifications · Turn on notifications | Mitteilungen · Mitteilungen einschalten | Notifications · Activer les notifications | Notificaciones · Activar notificaciones | الإشعارات · فعّل الإشعارات | 通知 · 通知をオンにする | 알림 · 알림 켜기 |
| Ayarlar · Titreşim · Dil · Yardım | Settings · Vibration · Language · Help | Einstellungen · Vibration · Sprache · Hilfe | Réglages · Vibrations · Langue · Aide | Ajustes · Vibración · Idioma · Ayuda | الإعدادات · الاهتزاز · اللغة · المساعدة | 設定 · バイブレーション · 言語 · ヘルプ | 설정 · 진동 · 언어 · 도움말 |

## Rules

- **Sentence case** everywhere, except **ribbons and tile names**, which a game
  sets in capitals: "GÜNÜN AKIŞI", "BU HAFTA", "TERFİ BÖLGESİ", "YENİ REKOR!".
  Type those capitals in each language's line yourself: the Turkish **İ** (and
  **I** for ı), German **SS** for ß, French and Spanish keep their accents
  (É, À, Á, Í); Arabic, Japanese and Korean have none. Never `textTransform: 'uppercase'` — it
  turns "Lig" into "LIG" and "bölgesi" into "BÖLGESI".
- **Errors:** what happened, then what to do, in one or two sentences. Never
  blame, never a raw exception. `messageFor(error, t)` in `src/lib/errors.ts`
  gives every API code its line in the player's language; the server's own
  `message` (already in the request's language) is shown only for
  `validation_failed`. The name rules are in `@quezby/config`; their words are
  `username.*` in the app's catalogs and `lang/{locale}/username.php` on the API.
- **Buttons:** a verb — "Oyna", "Tekrar oyna", "Kaydet", "Hesabı koru".
  Destructive buttons name what goes: "Hesabı kalıcı olarak sil". Apple's and
  Google's buttons use the companies' own words in each language ("Continue with
  Apple", "Mit Apple fortfahren", …).
- **Empty states:** what is missing and the action that fixes it — "Zirve boş…
  İlk sen ol" with **Oyna**.
- **Numbers:** each language groups and marks decimals its own way, through
  `t.fmt` — never by hand:

  | | Score | Per cent | Combo |
  | --- | --- | --- | --- |
  | tr | `12.345` | `%94,2` | `x1,25` |
  | en | `12,345` | `94.2%` | `x1.25` |
  | de | `12.345` | `94,2 %` | `x1,25` |
  | fr | `12 345` | `94,2 %` | `x1,25` |
  | es | `1234`, `12.345` | `94,2 %` | `x1,25` |
  | ar | `12,345` | `94.2%` | `x1.25` |
  | ja | `12,345` | `94.2%` | `x1.25` |
  | ko | `12,345` | `94.2%` | `x1.25` |

  Rank as `#12`, an unknown rank as `—`. The API groups the share text's
  numbers the same way (`Locale::group`).
- **Dates and times** come through `t.fmt` too, on the phone's calendar and
  clock: `t.fmt.date` ("24 Eylül", "24. September", "24 de septiembre"),
  `t.fmt.time` (24-hour, "14:05") and `t.fmt.ago` — how long ago, short
  ("şimdi", "5 dk", "3 sa", "2 g"), and past a week the date. The inbox, a
  conversation's lines and the past games use them.
- **Directions:** no line says "top right" or "on the left" — Arabic mirrors the
  screen. Name the thing instead ("the settings button on your profile").
- **Names:** a player's name is always written with `handle(name)` — `@ekin` —
  never `` `@${name}` `` (in Arabic it keeps its `@` in front).
- **Brand:** always **Quezby** — never QUEZBY, never Quezbi, never translated.

### Arabic

- Right to left: the layout mirrors itself; words never say a side.
- No capitals and **no letter-spacing** — spacing tears Arabic's joined letters
  apart (`tracking()` returns 0 in Arabic).
- **Latin digits** (0–9), grouped with a comma: `12,345`.
- A Latin piece inside an Arabic sentence — a name, `#12`, `x1.25`, `▲8` — is
  wrapped in left-to-right marks (U+200E, `iso()` / `ltr()`) so it keeps its
  own order. Not the Unicode isolates (U+2066 … U+2069): iOS ignores them and
  `@ekin` comes out `ekin@`.
- Counts take six forms: 0, 1, 2, 3–10, 11–99 and the rest
  (`pluralCategory('ar', n)`).
- **VS** is تحدٍّ, a challenge — the mode, its sheet, the HUD's pill, the past
  games' filter (التحديات); where two portraits face each other (`FaceOff`),
  the word between them is ضد, "against".

### Japanese and Korean

- Their own faces (M PLUS Rounded 1c; Jua and Gothic A1), cut to the letters
  the game writes: a new Japanese or Korean line can bring a kanji or a
  syllable the files lack. `pnpm fonts:cjk` cuts them again; its test fails
  until then.
- A character is about twice as wide as a Latin letter. Keep labels, chips
  and ribbons as short as the English, never longer; a post's length limit
  counts each character two (`scripts/content-rules.ts`).
- No capitals: a ribbon's line is written as it is (新記録！, 신기록!).
- **Japanese** punctuation is full width (、。！？「」…), with no spaces
  between words; a half-width space around a Latin word only where natural.
  **Korean** uses Latin punctuation and normal spacing (띄어쓰기).
- No plurals: every count is one form (`other`). Digits are Latin, grouped
  with a comma (`12,345`). Times and dates have their own units (`5分`,
  `3시간`, `9月28日`, `9월 28일`) through `t.fmt`.
- Names stay as given (`@ekin`), with no marks around them; the brand stays
  **Quezby**.
