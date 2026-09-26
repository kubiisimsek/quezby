import type {
  AdminActivityStatus,
  AdminAuditAction,
  AdminAuditVia,
  AdminDeviceVerdict,
  AdminFunnelStep,
  AdminGesture,
  AdminMilestone,
  AdminPostKind,
  AdminRole,
  AdminRunStatus,
  AdminVerdict,
  AnalyticsEvent,
  AnalyticsScreen,
  LeaderboardBoard,
  LeagueOutcome,
  LeagueTier,
  LeagueZone,
  Platform,
  RunFlagCode,
  RunFlagSeverity,
  RunMode,
  SocialProvider,
} from '@quezby/types';

import type { TagTone } from '@/components/base/tag';

/**
 * Everything the panel writes that is not a sentence: numbers the Turkish
 * way (12.345, %94,2), times on the game's clock (Europe/Istanbul, where a
 * day and a board turn over), and the words for every code the API sends.
 */

export const TIMEZONE = 'Europe/Istanbul';

const integer = new Intl.NumberFormat('tr-TR');
const percent = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, day: 'numeric', month: 'short', weekday: 'short' });
const shortDayFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, day: 'numeric', month: 'short' });
const monthFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, month: 'long', year: 'numeric' });

/** `12.345`; a missing number is a dash. */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : integer.format(value);
}

/** A per-mille value as the API sends it (`942`) as a percentage: `%94,2`. */
export function formatPerMille(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : percent.format(value / 1000);
}

/** A combo multiplier the API sends per-mille (`1500`) as the game shows it: `×1,5`. */
export function formatCombo(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `×${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1000)}`;
}

/** `430 ms`. */
export function formatMs(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${integer.format(value)} ms`;
}

/** `4 dk 12 sn`, `1 sa 5 dk`, `42 sn`. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 === 0 ? `${minutes} dk` : `${minutes} dk ${seconds % 60} sn`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} sa` : `${hours} sa ${minutes % 60} dk`;
}

/** `25 Eyl 2026`. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : '—';
}

/** `14:05`, on the game's clock. */
export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFormat.format(new Date(iso)) : '—';
}

/** `25 Eyl 2026 14:05`. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? `${dateFormat.format(new Date(iso))} ${timeFormat.format(new Date(iso))}` : '—';
}

/** `az önce`, `12 dk önce`, `3 sa önce`, `dün 14:05`, `4 gün önce` — then the date. */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const at = new Date(iso);
  const seconds = Math.round((now.getTime() - at.getTime()) / 1000);
  if (seconds < 60) return 'az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && dayKeyOf(at) === dayKeyOf(now)) return `${hours} sa önce`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKeyOf(at) === dayKeyOf(yesterday)) return `dün ${formatTime(iso)}`;
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days < 7) return `${days} gün önce`;
  return formatDate(iso);
}

/** The game's day an instant falls on, `Y-m-d` — as the API keys its daily boards. */
export function dayKeyOf(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(at)
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function startOfDay(at: Date): number {
  return new Date(`${dayKeyOf(at)}T00:00:00Z`).getTime();
}

/** A daily board's key, `2026-09-25`, as `25 Eyl Cum`. */
export function formatDayKey(key: string): string {
  const at = new Date(`${key}T12:00:00+03:00`);
  return Number.isNaN(at.getTime()) ? key : dayFormat.format(at);
}

/** "Günün akışı #12"'s `#12`; a day before the first has none. */
export function formatChallenge(number: number | null | undefined): string {
  return number == null ? '—' : `#${formatNumber(number)}`;
}

/** A challenge day by its number and date: `#12 · 25 Eyl Cum`. */
export function formatChallengeDay(day: { key: string; number: number | null }): string {
  return day.number === null ? formatDayKey(day.key) : `${formatChallenge(day.number)} · ${formatDayKey(day.key)}`;
}

/** A weekly key, `2026-W39`, as the days it covers: `21 – 27 Eyl`. */
export function formatWeekKey(key: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return key;
  const year = Number(match[1]);
  const week = Number(match[2]);
  // ISO weeks: week 1 is the one with 4 January in it, and weeks start on Monday.
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  const monday = jan4 - jan4Weekday * 86_400_000 + (week - 1) * 7 * 86_400_000;
  const noon = (offsetDays: number) => new Date(monday + offsetDays * 86_400_000 + 9 * 3_600_000);
  return `${shortDayFormat.format(noon(0))} – ${shortDayFormat.format(noon(6))}`;
}

/** A monthly key, `2026-09`, as `Eylül 2026`. */
export function formatMonthKey(key: string): string {
  const at = new Date(`${key}-15T12:00:00+03:00`);
  return Number.isNaN(at.getTime()) ? key : monthFormat.format(at);
}

/** A board's period key in words, whatever the board. */
export function formatPeriodKey(board: LeaderboardBoard, key: string): string {
  switch (board) {
    case 'daily':
    case 'challenge':
      return formatDayKey(key);
    case 'weekly':
      return formatWeekKey(key);
    case 'monthly':
      return formatMonthKey(key);
    case 'all':
      return 'Tüm zamanlar';
  }
}

/** `@kerem.35`, or what the player is while they have no name. */
export function playerName(username: string | null | undefined): string {
  return username ? `@${username}` : 'Adsız oyuncu';
}

/** A run id as people read it: its last eight characters. */
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

/* ------------------------------------------------------------- the codes -- */

type Label = { tone: TagTone; label: string };

export const RUN_STATUS: Record<AdminRunStatus, Label> = {
  started: { tone: 'neutral', label: 'Açık' },
  ranked: { tone: 'ok', label: 'Sıralamada' },
  flagged: { tone: 'bad', label: 'Bayraklı' },
  review: { tone: 'warn', label: 'İncelemede' },
  rejected: { tone: 'bad', label: 'Reddedildi' },
  abandoned: { tone: 'neutral', label: 'Yarıda kaldı' },
  expired: { tone: 'neutral', label: 'Süresi doldu' },
};

export const SEVERITY: Record<RunFlagSeverity, Label> = {
  hard: { tone: 'bad', label: 'Sert' },
  soft: { tone: 'warn', label: 'Yumuşak' },
};

/** Every anti-cheat signal in words — `docs/product/scoring.md` → "Hile koruması". */
export const RUN_FLAG: Record<RunFlagCode, { label: string; hint: string }> = {
  wall_clock: { label: 'Süre tutmuyor', hint: 'Tur, uygulamanın temposunun izin verdiğinden kısa sürede bitti.' },
  fast_decisions: { label: 'İnsanüstü hız', hint: 'Kararların %20’sinden fazlası 250 ms’nin altında.' },
  hold_bounds: { label: 'İmkânsız basılı tutma', hint: 'Uygulamanın çoktan bitireceği uzunlukta bir basılı tutma.' },
  client_mismatch: { label: 'Skor uyuşmuyor', hint: 'Uygulamanın gösterdiği skor sunucunun tekrarıyla aynı değil.' },
  banned: { label: 'Yasaklıyken oynandı', hint: 'Oyuncu bu turu yasaklıyken oynadı.' },
  checkpoint_forged: { label: 'Sahte makbuz', hint: 'Kontrol noktası makbuzu sahte ya da başka bir turun.' },
  checkpoint_mismatch: { label: 'Geçmiş değişmiş', hint: 'Kontrol noktasına kadarki hamleler sonradan değiştirilmiş.' },
  slow_motion: { label: 'Yavaşlatılmış oyun', hint: 'Geçen süre, hamlelerin gerektirdiğinin çok üstünde: hız hilesi.' },
  device_integrity: { label: 'Cihaz güvenilmez', hint: 'Play Integrity ya da App Attest bu cihaza karşı çıktı.' },
  engine_error: { label: 'Motor reddetti', hint: 'Hamle kaydı oyunun kurallarına uymuyor.' },
  moderator: { label: 'Moderatör reddi', hint: 'Bir moderatör bu turu reddetti.' },
  reaction_cv: { label: 'Makine gibi ritim', hint: 'Karar süreleri bir insan için fazla düzenli.' },
  floor_hugging: { label: 'Sınırda kararlar', hint: 'Kararlar 250–280 ms aralığına yığılmış.' },
  perfect_share: { label: 'Hep mükemmel', hint: 'Altın postların %90’ından fazlası mükemmel.' },
  slow_timing: { label: 'Biraz yavaş', hint: 'Geçen süre, hamlelerin gerektirdiğinden biraz uzun.' },
  checkpoint_missing: { label: 'Makbuz eksik', hint: 'Beklenen kontrol noktası makbuzu gelmedi.' },
  device_unverified: { label: 'Cihaz kararı yok', hint: 'Cihaz doğrulanamadı; tur sıralamaya girer, zirvesi incelenir.' },
  score_jump: { label: 'Ani sıçrama', hint: 'Skor, oyuncunun sezon rekorunun en az üç katı.' },
  daily_shared_install: { label: 'Aynı cihazda ikinci hesap', hint: 'Aynı telefondaki başka bir hesap bugünün akışını da oynadı.' },
};

export const ADMIN_ROLE: Record<AdminRole, Label & { hint: string }> = {
  owner: { tone: 'primary', label: 'Sahip', hint: 'Her şey: yöneticiler, sistem, hesap silme.' },
  moderator: { tone: 'secondary', label: 'Moderatör', hint: 'Yasaklar, adlar, turları onaylama ve reddetme.' },
  viewer: { tone: 'neutral', label: 'İzleyici', hint: 'Yalnızca bakar, hiçbir şeyi değiştiremez.' },
};

export const AUDIT_ACTION: Record<AdminAuditAction, Label> = {
  'auth.login': { tone: 'neutral', label: 'Giriş yaptı' },
  'auth.password_changed': { tone: 'neutral', label: 'Şifresini değiştirdi' },
  'player.ban': { tone: 'bad', label: 'Oyuncuyu yasakladı' },
  'player.unban': { tone: 'ok', label: 'Yasağı kaldırdı' },
  'player.rename': { tone: 'warn', label: 'Adı sıfırladı' },
  'player.sign_out': { tone: 'warn', label: 'Oturumları kapattı' },
  'player.delete': { tone: 'bad', label: 'Hesabı sildi' },
  'run.approve': { tone: 'ok', label: 'Turu onayladı' },
  'run.reject': { tone: 'bad', label: 'Turu reddetti' },
  'admin.create': { tone: 'secondary', label: 'Yönetici ekledi' },
  'admin.update': { tone: 'secondary', label: 'Yöneticiyi güncelledi' },
  'admin.reset_password': { tone: 'warn', label: 'Şifre sıfırladı' },
  'system.migrate': { tone: 'primary', label: 'Migration çalıştırdı' },
  'system.optimize': { tone: 'primary', label: 'Önbelleği yeniledi' },
  'system.expire_runs': { tone: 'primary', label: 'Yarım turları kapattı' },
  'system.analytics_prune': { tone: 'primary', label: 'Analitiği temizledi' },
};

export const AUDIT_VIA: Record<AdminAuditVia, string> = {
  panel: 'Panel',
  cli: 'Komut satırı',
  ops: 'Ops',
  system: 'Sistem',
};

export const LEAGUE_TIER: Record<LeagueTier, string> = {
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
  platinum: 'Platin',
  diamond: 'Elmas',
};

export const LEAGUE_TIERS: LeagueTier[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];

export const LEAGUE_ZONE: Record<LeagueZone, Label> = {
  promote: { tone: 'ok', label: 'Yükseliyor' },
  stay: { tone: 'neutral', label: 'Kalıyor' },
  demote: { tone: 'bad', label: 'Düşüyor' },
};

export const LEAGUE_OUTCOME: Record<LeagueOutcome, Label> = {
  promoted: { tone: 'ok', label: 'Yükseldi' },
  stayed: { tone: 'neutral', label: 'Kaldı' },
  demoted: { tone: 'bad', label: 'Düştü' },
};

/** The four kinds of post, as the game calls them, and the move each one asks for. */
export const POST_KIND: Record<AdminPostKind, { label: string; move: string }> = {
  skip: { label: 'Sıradan', move: 'Yukarı kaydır' },
  like: { label: 'Arkadaş', move: 'Çift dokun' },
  hold: { label: 'Altın', move: 'Basılı tut' },
  freeze: { label: 'Kırmızı', move: 'Dokunma' },
};

/** How the replay judged a post. A perfect is good news too, so `ok` — never `primary`, whose magenta reads as `bad`. */
export const VERDICT: Record<AdminVerdict, Label> = {
  hit: { tone: 'ok', label: 'İsabet' },
  perfect: { tone: 'ok', label: 'Mükemmel' },
  timeout: { tone: 'bad', label: 'Süre doldu' },
  wrong: { tone: 'bad', label: 'Yanlış hareket' },
  holdEarly: { tone: 'warn', label: 'Erken bıraktı' },
  holdLate: { tone: 'warn', label: 'Geç bıraktı' },
  caught: { tone: 'bad', label: 'Dokundu' },
  drained: { tone: 'neutral', label: 'Dopamin bitti' },
};

export const GESTURE: Record<AdminGesture, string> = {
  none: 'Hareket yok',
  up: 'Kaydırdı',
  like: 'Çift dokundu',
  hold: 'Basılı tuttu',
  touch: 'Dokundu',
};

export const RUN_MODE: Record<RunMode, string> = {
  free: 'Serbest',
  daily: 'Günün akışı',
};

export const BOARD: Record<LeaderboardBoard, string> = {
  daily: 'Bugün',
  weekly: 'Hafta',
  monthly: 'Ay',
  all: 'Tüm zamanlar',
  challenge: 'Günün akışı',
};

export const PLATFORM: Record<Platform, string> = { ios: 'iOS', android: 'Android' };

export const PROVIDER: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' };

export const DEVICE_VERDICT: Record<AdminDeviceVerdict, Label> = {
  pass: { tone: 'ok', label: 'Doğrulandı' },
  fail: { tone: 'bad', label: 'Güvenilmez' },
};

export const END_REASON: Record<'drained' | 'penalty' | 'quit', string> = {
  drained: 'Dopamin bitti',
  penalty: 'Cezayla bitti',
  quit: 'Oyuncu çıktı',
};

/* ------------------------------------------------------------ analytics -- */

/** The screens a visit goes through, by the game's own names for them. */
export const ANALYTICS_SCREEN: Record<AnalyticsScreen, string> = {
  welcome: 'Karşılama',
  login: 'Giriş',
  tutorial: 'Deneme turu',
  username: 'Ad seçimi',
  protect: 'Hesabı koru',
  home: 'Lobi',
  leaderboard: 'Zirve',
  league: 'Lig',
  search: 'Arkadaşlar',
  profile: 'Profil',
  game: 'Oyun',
  help: 'Yardım',
  daily: 'Günün akışı',
};

/** The moments a visit counts. Only a failure is bad news. */
export const ANALYTICS_EVENT: Record<AnalyticsEvent, Label> = {
  share_result: { tone: 'ok', label: 'Turu paylaştı' },
  share_daily: { tone: 'ok', label: 'Günün akışını paylaştı' },
  rival: { tone: 'secondary', label: 'Geç onu' },
  player_card: { tone: 'secondary', label: 'Oyuncu kartına baktı' },
  offline_run: { tone: 'warn', label: 'Çevrimdışı tur' },
  outdated_run: { tone: 'warn', label: 'Eski sürümle tur' },
  unsent_run: { tone: 'bad', label: 'Gönderilemeyen tur' },
  offline_gate: { tone: 'bad', label: '“Bağlanamadık” ekranı' },
  update_gate: { tone: 'warn', label: '“Güncelleme gerekli” ekranı' },
  tutorial_done: { tone: 'ok', label: 'Deneme turunu bitirdi' },
  nickname_skip: { tone: 'neutral', label: 'Ad seçmeyi geçti' },
  protect_skip: { tone: 'neutral', label: 'Hesap korumayı geçti' },
  protect_reminder: { tone: 'neutral', label: 'Koruma hatırlatmasını gördü' },
};

/** A new player's first steps, in the order they usually come. */
export const FUNNEL_STEP: Record<AdminFunnelStep, { label: string; hint: string }> = {
  joined: { label: 'Katıldı', hint: 'İlk gününde izin verip oyunu açanlar' },
  tutorial: { label: 'Deneme turunu bitirdi', hint: 'Koçlu ilk tur' },
  named: { label: 'Adını seçti', hint: 'Otomatik adda kalmadı' },
  protected: { label: 'Hesabını korudu', hint: 'Apple, Google ya da e-posta' },
  first_run: { label: 'İlk sayılan tur', hint: 'Sıralamaya giren, puan alan' },
  league: { label: 'Lige girdi', hint: 'Bir gruba oturdu' },
  returned: { label: 'Ertesi gün döndü', hint: 'Dünden önce katılanlardan' },
};

/** A first in a player's life. */
export const MILESTONE: Record<AdminMilestone, string> = {
  joined: 'Hesap açıldı',
  tutorial_done: 'Deneme turunu bitirdi',
  nickname_skip: 'Ad seçmeyi geçti',
  protect_skip: 'Hesap korumayı geçti',
  protect_reminder: 'Koruma hatırlatmasını gördü',
  protected: 'Hesabını korudu',
  first_run: 'İlk sayılan tur',
  league: 'Lige girdi',
};

/** Whether a player's activity is kept, and why not. */
export const ACTIVITY_STATUS: Record<AdminActivityStatus, Label & { hint: string }> = {
  tracked: { tone: 'ok', label: 'Kullanım verisi açık', hint: 'Oyuncu izin verdi; ziyaretleri 30 gün, günleri 90 gün tutulur.' },
  no_consent: {
    tone: 'neutral',
    label: 'İzin vermedi',
    hint: 'Oyuncu kullanım verisine izin vermedi: ziyareti ya da günü tutulmaz. Cihaz kaydı ve oyun verisi durur.',
  },
  not_sampled: {
    tone: 'warn',
    label: 'Örneklem dışında',
    hint: 'Analitik şu an izin verenlerin bir kısmı için tutuluyor (QUEZBY_ANALYTICS_SAMPLE); bu oyuncu dışarıda.',
  },
  disabled: { tone: 'bad', label: 'Analitik kapalı', hint: 'QUEZBY_ANALYTICS_ENABLED kapalı: şu an kimsenin kullanım verisi tutulmuyor.' },
};
