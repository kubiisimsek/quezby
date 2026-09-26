import type { ReelKind } from '@quezby/engine';
import type { Locale } from '@quezby/types';

/**
 * The four kinds of post in words — the help screen, the practice run's
 * coach cards and the hints on a post read them through `reelGuide`.
 * `badge` is the tag a post of that kind wears; the plain post wears none.
 */
type ReelWords = { title: string; body: string; badge: string | null; hint: string };

const tr = {
  skip: {
    title: 'Sıradan post',
    body: 'Yukarı kaydır. Ne kadar hızlı, o kadar puan.',
    badge: null,
    hint: 'Sıkıcı içerik — yukarı kaydır',
  },
  like: {
    title: 'Arkadaşın',
    body: 'Pembe postu çift dokunarak beğen. Geçersen ceza.',
    badge: 'Arkadaşın',
    hint: 'Arkadaşının postu — çift dokun',
  },
  hold: {
    title: 'Altın post',
    body: 'Basılı tut, çubuk yeşildeyken bırak. Tam ortası mükemmel.',
    badge: 'Altın post',
    hint: 'Basılı tut, yeşil bölgede bırak',
  },
  freeze: {
    title: 'Dokunma!',
    body: 'Kırmızı postta elini çek, süre bitsin. Refleksini yen.',
    badge: 'Dokunma',
    hint: 'Hiçbir şeye dokunma, geçmesini bekle',
  },
} satisfies Record<ReelKind, ReelWords>;

export type ReelMessages = Record<ReelKind, ReelWords>;

const en: ReelMessages = {
  skip: {
    title: 'Plain post',
    body: 'Swipe up. The faster, the more points.',
    badge: null,
    hint: 'Boring stuff — swipe up',
  },
  like: {
    title: 'Your friend',
    body: 'Double-tap the pink post to like it. Swipe past it and you lose points.',
    badge: 'Your friend',
    hint: "Your friend's post — double-tap",
  },
  hold: {
    title: 'Gold post',
    body: 'Press and hold, let go while the bar is green. Dead center is perfect.',
    badge: 'Gold post',
    hint: 'Hold, let go in the green',
  },
  freeze: {
    title: "Don't touch!",
    body: 'Hands off the red post until time runs out. Beat your reflex.',
    badge: "Don't touch",
    hint: 'Touch nothing, wait it out',
  },
};

const de: ReelMessages = {
  skip: {
    title: 'Normaler Post',
    body: 'Wisch nach oben. Je schneller, desto mehr Punkte.',
    badge: null,
    hint: 'Langweilig – nach oben wischen',
  },
  like: {
    title: 'Dein Freund',
    body: 'Tipp doppelt auf den pinken Post, um ihn zu liken. Wischst du weiter, gibt es Abzug.',
    badge: 'Dein Freund',
    hint: 'Post von deinem Freund – doppelt tippen',
  },
  hold: {
    title: 'Gold-Post',
    body: 'Gedrückt halten und loslassen, solange der Balken grün ist. Genau die Mitte ist perfekt.',
    badge: 'Gold-Post',
    hint: 'Halten, im Grünen loslassen',
  },
  freeze: {
    title: 'Nicht berühren!',
    body: 'Finger weg vom roten Post, bis die Zeit um ist. Besieg deinen Reflex.',
    badge: 'Nicht berühren',
    hint: 'Nichts berühren, einfach abwarten',
  },
};

const ar: ReelMessages = {
  skip: {
    title: 'منشور عادي',
    body: 'اسحب للأعلى. كلما كنت أسرع زادت نقاطك.',
    badge: null,
    hint: 'محتوى ممل — اسحب للأعلى',
  },
  like: {
    title: 'صديقك',
    body: 'انقر مرتين على المنشور الوردي لتعجب به. إن تجاوزته خسرت نقاطًا.',
    badge: 'صديقك',
    hint: 'منشور صديقك — انقر مرتين',
  },
  hold: {
    title: 'منشور ذهبي',
    body: 'اضغط مطولًا وارفع إصبعك والشريط أخضر. المنتصف تمامًا هو الأفضل.',
    badge: 'منشور ذهبي',
    hint: 'اضغط مطولًا وارفع في المنطقة الخضراء',
  },
  freeze: {
    title: 'لا تلمس!',
    body: 'ابعد يدك عن المنشور الأحمر حتى ينتهي الوقت. تغلّب على ردة فعلك.',
    badge: 'لا تلمس',
    hint: 'لا تلمس شيئًا، انتظر حتى يمر',
  },
};

const fr: ReelMessages = {
  skip: {
    title: 'Post banal',
    body: 'Swipe vers le haut. Plus tu es rapide, plus tu marques.',
    badge: null,
    hint: 'Contenu ennuyeux — swipe vers le haut',
  },
  like: {
    title: 'Ton ami',
    body: "Tape deux fois sur le post rose pour l'aimer. Si tu le passes, pénalité.",
    badge: 'Ton ami',
    hint: 'Post de ton ami — tape deux fois',
  },
  hold: {
    title: 'Post doré',
    body: "Reste appuyé, relâche quand la barre est verte. Pile au milieu, c'est parfait.",
    badge: 'Post doré',
    hint: 'Reste appuyé, relâche dans le vert',
  },
  freeze: {
    title: 'Touche pas !',
    body: "Ne touche pas au post rouge jusqu'à la fin du temps. Bats ton réflexe.",
    badge: 'Touche pas',
    hint: 'Ne touche à rien, attends',
  },
};

const es: ReelMessages = {
  skip: {
    title: 'Post normal',
    body: 'Desliza hacia arriba. Cuanto más rápido, más puntos.',
    badge: null,
    hint: 'Contenido aburrido: desliza hacia arriba',
  },
  like: {
    title: 'Tu amigo',
    body: 'Toca dos veces el post rosa para darle me gusta. Si lo pasas, pierdes puntos.',
    badge: 'Tu amigo',
    hint: 'Post de tu amigo: toca dos veces',
  },
  hold: {
    title: 'Post dorado',
    body: 'Mantén pulsado y suelta cuando la barra esté en verde. Justo en el centro es perfecto.',
    badge: 'Post dorado',
    hint: 'Mantén y suelta en el verde',
  },
  freeze: {
    title: '¡No toques!',
    body: 'Quita el dedo del post rojo hasta que se acabe el tiempo. Vence tu reflejo.',
    badge: 'No toques',
    hint: 'No toques nada, espera',
  },
};

export const reels: Record<Locale, ReelMessages> = { tr, en, de, ar, fr, es };
