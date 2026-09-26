import type { Locale } from '@quezby/types';

/**
 * A phone that failed Google's or Apple's integrity check plays on, but its
 * runs never rank; the result of such a run and the lobby say so in these
 * words.
 */
const tr = {
  failedTitle: 'Bu cihazda skorlar sıralamaya girmiyor',
  failedWhy: {
    android:
      'Google’ın güvenlik kontrolü bu cihazı onaylamadı: root’lu bir telefon, emülatör ya da değiştirilmiş bir uygulama olabilir.',
    ios: 'Apple’ın güvenlik kontrolü bu cihazı onaylamadı: jailbreak’li bir telefon ya da değiştirilmiş bir uygulama olabilir.',
  },
};

export type DeviceMessages = typeof tr;

const en: DeviceMessages = {
  failedTitle: "Scores on this device don't rank",
  failedWhy: {
    android:
      "Google's security check didn't approve this device: it may be a rooted phone, an emulator or a modified app.",
    ios: "Apple's security check didn't approve this device: it may be a jailbroken phone or a modified app.",
  },
};

const de: DeviceMessages = {
  failedTitle: 'Auf diesem Gerät zählen Scores nicht für die Rangliste',
  failedWhy: {
    android:
      'Googles Sicherheitsprüfung hat dieses Gerät nicht bestätigt: vielleicht ein gerootetes Handy, ein Emulator oder eine veränderte App.',
    ios: 'Apples Sicherheitsprüfung hat dieses Gerät nicht bestätigt: vielleicht ein gejailbreaktes Handy oder eine veränderte App.',
  },
};

const ar: DeviceMessages = {
  failedTitle: 'النتائج على هذا الجهاز لا تدخل الترتيب',
  failedWhy: {
    android:
      'لم يعتمد فحص الأمان من Google هذا الجهاز: قد يكون هاتفًا بصلاحيات الروت أو محاكيًا أو تطبيقًا معدّلًا.',
    ios: 'لم يعتمد فحص الأمان من Apple هذا الجهاز: قد يكون هاتفًا مكسور الحماية (جيلبريك) أو تطبيقًا معدّلًا.',
  },
};

const fr: DeviceMessages = {
  failedTitle: 'Sur cet appareil, les scores ne sont pas classés',
  failedWhy: {
    android:
      "Le contrôle de sécurité de Google n'a pas validé cet appareil : téléphone rooté, émulateur ou application modifiée.",
    ios: "Le contrôle de sécurité d'Apple n'a pas validé cet appareil : téléphone jailbreaké ou application modifiée.",
  },
};

const es: DeviceMessages = {
  failedTitle: 'En este dispositivo las puntuaciones no entran en la clasificación',
  failedWhy: {
    android:
      'La comprobación de seguridad de Google no aprobó este dispositivo: puede ser un teléfono rooteado, un emulador o una app modificada.',
    ios: 'La comprobación de seguridad de Apple no aprobó este dispositivo: puede ser un teléfono con jailbreak o una app modificada.',
  },
};

export const device: Record<Locale, DeviceMessages> = { tr, en, de, ar, fr, es };
