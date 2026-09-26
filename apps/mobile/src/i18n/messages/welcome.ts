import type { Locale } from '@quezby/types';

/**
 * The first screen: what the game is, its four moves, and the two ways in —
 * **Oyna** (a guest account and the practice run) or back to a kept account.
 * The game's name is Quezby in every language and is not a line here.
 */
const tr = {
  tagline: 'Kaydırma alışkanlığın, rekabete dönüştü.',
  moves: 'Dört hareket, tek refleks. Önce bir deneme turunda oynayarak öğren — o tur sayılmaz.',
  play: 'Oyna',
  signIn: 'Hesabım var, giriş yap',
};

export type WelcomeMessages = typeof tr;

const en: WelcomeMessages = {
  tagline: 'Your scrolling habit, now a competition.',
  moves: "Four moves, one reflex. Learn them in a practice run first — it doesn't count.",
  play: 'Play',
  signIn: 'I have an account, sign in',
};

const de: WelcomeMessages = {
  tagline: 'Aus deiner Scroll-Gewohnheit wird ein Wettkampf.',
  moves: 'Vier Moves, ein Reflex. Lern sie zuerst in einer Proberunde – die zählt nicht.',
  play: 'Spielen',
  signIn: 'Ich habe ein Konto – anmelden',
};

const ar: WelcomeMessages = {
  tagline: 'عادتك في التمرير أصبحت منافسة.',
  moves: 'أربع حركات، ردّ فعل واحد. تعلّمها أولًا باللعب في جولة تجريبية — لا تُحتسب.',
  play: 'العب',
  signIn: 'لديّ حساب، سجّل الدخول',
};

const fr: WelcomeMessages = {
  tagline: 'Ton habitude de scroller est devenue une compétition.',
  moves: "Quatre gestes, un seul réflexe. Apprends-les d'abord en jouant une partie d'essai — elle ne compte pas.",
  play: 'Jouer',
  signIn: "J'ai un compte, me connecter",
};

const es: WelcomeMessages = {
  tagline: 'Tu hábito de deslizar, convertido en competición.',
  moves: 'Cuatro movimientos, un solo reflejo. Apréndelos primero jugando una ronda de práctica, que no cuenta.',
  play: 'Jugar',
  signIn: 'Ya tengo cuenta, iniciar sesión',
};

export const welcome: Record<Locale, WelcomeMessages> = { tr, en, de, ar, fr, es };
