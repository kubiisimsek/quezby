import type { Locale } from '@quezby/types';

/**
 * The first screen: what the game is, its four moves, and **Oyna** — the
 * practice run. The ways in come after it. The game's name is Quezby in
 * every language and is not a line here.
 */
const tr = {
  tagline: 'Kaydırma alışkanlığın, rekabete dönüştü.',
  moves: 'Dört hareket, tek refleks. Önce bir deneme turunda oynayarak öğren.',
  play: 'Oyna',
};

export type WelcomeMessages = typeof tr;

const en: WelcomeMessages = {
  tagline: 'Your scrolling habit, now a competition.',
  moves: 'Four moves, one reflex. Learn them in a practice run first.',
  play: 'Play',
};

const de: WelcomeMessages = {
  tagline: 'Aus deiner Scroll-Gewohnheit wird ein Wettkampf.',
  moves: 'Vier Moves, ein Reflex. Lern sie zuerst in einer Proberunde.',
  play: 'Spielen',
};

const ar: WelcomeMessages = {
  tagline: 'عادتك في التمرير أصبحت منافسة.',
  moves: 'أربع حركات، ردّ فعل واحد. تعلّمها أولًا باللعب في جولة تجريبية.',
  play: 'العب',
};

const fr: WelcomeMessages = {
  tagline: 'Ton habitude de scroller est devenue une compétition.',
  moves: "Quatre gestes, un seul réflexe. Apprends-les d'abord en jouant une partie d'essai.",
  play: 'Jouer',
};

const es: WelcomeMessages = {
  tagline: 'Tu hábito de deslizar, convertido en competición.',
  moves: 'Cuatro movimientos, un solo reflejo. Apréndelos primero jugando una ronda de práctica.',
  play: 'Jugar',
};

const ja: WelcomeMessages = {
  tagline: 'いつものスクロールが、真剣勝負に。',
  moves: '4つの動きに、ひとつの反射神経。まずは練習プレイで覚えよう。',
  play: 'プレイ',
};

const ko: WelcomeMessages = {
  tagline: '스크롤하던 습관이 이제 경쟁이 돼요.',
  moves: '네 가지 동작, 하나의 반사 신경. 먼저 연습 게임으로 익혀 보세요.',
  play: '플레이',
};

export const welcome: Record<Locale, WelcomeMessages> = { tr, en, de, ar, fr, es, ja, ko };
