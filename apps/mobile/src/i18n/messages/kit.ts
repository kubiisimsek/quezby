import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

/** What a player row says to a screen reader: who, whether it is you, their league, their record. */
type PlayerRowLabel = { name: string; me: boolean; league: string | null; record: string };

/**
 * The words built into the kit's shapes: the way back on a pushed screen, a
 * sheet's close and save, a glyph button's count, the Apple and Google
 * buttons, a password's eye and a player in a list. `name` is always a
 * player's name as `handle` writes it.
 */
const tr = {
  topBar: { back: 'Geri' },
  sheet: { close: 'Kapat', save: 'Kaydet' },
  iconButton: {
    /** A glyph button with a count on its corner, as a screen reader says it. */
    badge: (label: string, count: number) => `${label}, ${count} yeni`,
  },
  socialButton: { apple: 'Apple ile devam et', google: 'Google ile devam et' },
  faceOff: {
    versus: 'VS',
    /** Two players face to face, as a screen reader says it. */
    label: (left: string, right: string) => `${left} VS ${right}`,
  },
  /** A notification over the game while it is open. */
  toast: { open: 'Açmak için dokun' },
  passwordField: { show: 'Şifreyi göster', hide: 'Şifreyi gizle' },
  playerRow: {
    me: (name: string) => `${name} · sen`,
    noRecord: 'Henüz rekor yok',
    record: (score: string) => `Sezon rekoru ${score}`,
    label: ({ name, me, league, record }: PlayerRowLabel) =>
      [me ? `${name}, sen` : name, league, record].filter(Boolean).join(', '),
  },
};

export type KitMessages = typeof tr;

const en: KitMessages = {
  topBar: { back: 'Back' },
  sheet: { close: 'Close', save: 'Save' },
  iconButton: {
    badge: (label, count) => `${label}, ${count} new`,
  },
  socialButton: { apple: 'Continue with Apple', google: 'Continue with Google' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: 'Tap to open' },
  passwordField: { show: 'Show password', hide: 'Hide password' },
  playerRow: {
    me: (name) => `${name} · you`,
    noRecord: 'No record yet',
    record: (score) => `Season record ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}, you` : name, league, record].filter(Boolean).join(', '),
  },
};

const de: KitMessages = {
  topBar: { back: 'Zurück' },
  sheet: { close: 'Schließen', save: 'Speichern' },
  iconButton: {
    badge: (label, count) => `${label}, ${count} neu`,
  },
  socialButton: { apple: 'Mit Apple fortfahren', google: 'Weiter mit Google' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: 'Zum Öffnen tippen' },
  passwordField: { show: 'Passwort anzeigen', hide: 'Passwort verbergen' },
  playerRow: {
    me: (name) => `${name} · du`,
    noRecord: 'Noch kein Rekord',
    record: (score) => `Saisonrekord ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}, du` : name, league, record].filter(Boolean).join(', '),
  },
};

const ar: KitMessages = {
  topBar: { back: 'رجوع' },
  sheet: { close: 'إغلاق', save: 'حفظ' },
  iconButton: {
    badge: (label, count) => `${label}، الجديد: ${count}`,
  },
  socialButton: { apple: 'المتابعة باستخدام Apple', google: 'المتابعة باستخدام Google' },
  faceOff: { versus: 'ضد', label: (left, right) => `${left} ضد ${right}` },
  toast: { open: 'اضغط للفتح' },
  passwordField: { show: 'إظهار كلمة المرور', hide: 'إخفاء كلمة المرور' },
  playerRow: {
    me: (name) => `${iso(name)} · أنت`,
    noRecord: 'لا رقم قياسي بعد',
    record: (score) => `الرقم القياسي للموسم ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${iso(name)}، أنت` : iso(name), league, record].filter(Boolean).join('، '),
  },
};

const fr: KitMessages = {
  topBar: { back: 'Retour' },
  sheet: { close: 'Fermer', save: 'Enregistrer' },
  iconButton: {
    badge: (label, count) =>
      plural('fr', count, {
        one: `${label}, ${count} nouveau`,
        other: `${label}, ${count} nouveaux`,
      }),
  },
  socialButton: { apple: 'Continuer avec Apple', google: 'Continuer avec Google' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: 'Touche pour ouvrir' },
  passwordField: { show: 'Afficher le mot de passe', hide: 'Masquer le mot de passe' },
  playerRow: {
    me: (name) => `${name} · toi`,
    noRecord: 'Pas encore de record',
    record: (score) => `Record de la saison ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}, toi` : name, league, record].filter(Boolean).join(', '),
  },
};

const es: KitMessages = {
  topBar: { back: 'Atrás' },
  sheet: { close: 'Cerrar', save: 'Guardar' },
  iconButton: {
    badge: (label, count) =>
      plural('es', count, {
        one: `${label}, ${count} nuevo`,
        other: `${label}, ${count} nuevos`,
      }),
  },
  socialButton: { apple: 'Continuar con Apple', google: 'Continuar con Google' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: 'Toca para abrir' },
  passwordField: { show: 'Mostrar contraseña', hide: 'Ocultar contraseña' },
  playerRow: {
    me: (name) => `${name} · tú`,
    noRecord: 'Aún sin récord',
    record: (score) => `Récord de la temporada ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}, tú` : name, league, record].filter(Boolean).join(', '),
  },
};

const ja: KitMessages = {
  topBar: { back: '戻る' },
  sheet: { close: '閉じる', save: '保存' },
  iconButton: {
    badge: (label, count) => `${label}、新着${count}件`,
  },
  socialButton: { apple: 'Appleで続ける', google: 'Googleで続行' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: 'タップして開く' },
  passwordField: { show: 'パスワードを表示', hide: 'パスワードを隠す' },
  playerRow: {
    me: (name) => `${name} · あなた`,
    noRecord: 'まだ記録なし',
    record: (score) => `シーズンベスト ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}、あなた` : name, league, record].filter(Boolean).join('、'),
  },
};

const ko: KitMessages = {
  topBar: { back: '뒤로' },
  sheet: { close: '닫기', save: '저장' },
  iconButton: {
    badge: (label, count) => `${label}, 새 항목 ${count}개`,
  },
  socialButton: { apple: 'Apple로 계속하기', google: 'Google로 계속하기' },
  faceOff: { versus: 'VS', label: (left, right) => `${left} VS ${right}` },
  toast: { open: '탭해서 열기' },
  passwordField: { show: '비밀번호 표시', hide: '비밀번호 숨기기' },
  playerRow: {
    me: (name) => `${name} · 나`,
    noRecord: '아직 기록 없음',
    record: (score) => `시즌 최고 기록 ${score}`,
    label: ({ name, me, league, record }) =>
      [me ? `${name}, 나` : name, league, record].filter(Boolean).join(', '),
  },
};

export const kit: Record<Locale, KitMessages> = { tr, en, de, ar, fr, es, ja, ko };
