import type { BonusKind, Locale } from '@quezby/types';

/**
 * The named combos: the plain name (the result), the toast in the run, and
 * what sets them off (help, coach). The numbers come from the engine's
 * `RULES` through `bonusGuide` — the words never promise a rule the game
 * does not keep.
 */
const tr = {
  flawless: {
    name: 'Kusursuz seviye',
    toast: 'Kusursuz seviye!',
    body: (posts: number) => `Bir seviyenin ${posts} postunu hiç hata yapmadan bitir.`,
  },
  lightning: {
    name: 'Şimşek',
    toast: 'Şimşek!',
    body: (run: number) => `Art arda ${run} hızlı kaydırma ya da beğeni.`,
  },
  coolHead: {
    name: 'Soğukkanlı',
    toast: 'Soğukkanlı!',
    body: 'Beğeniden ya da altın posttan hemen sonra gelen kırmızı postta elini çek.',
  },
  comeback: {
    name: 'Geri dönüş',
    toast: 'Geri dönüş!',
    body: (low: number, high: number) =>
      `Dopamin %${low}’un altına düştükten sonra %${high}’ye geri çık.`,
  },
} satisfies Record<BonusKind, { name: string; toast: string; body: unknown }>;

export type BonusMessages = typeof tr;

const en: BonusMessages = {
  flawless: {
    name: 'Flawless level',
    toast: 'Flawless level!',
    body: (posts) => `Finish all ${posts} posts of a level without a single mistake.`,
  },
  lightning: {
    name: 'Lightning',
    toast: 'Lightning!',
    body: (run) => `${run} fast swipes or likes in a row.`,
  },
  coolHead: {
    name: 'Cool head',
    toast: 'Cool head!',
    body: 'Keep your hands off the red post that comes right after a like or a gold post.',
  },
  comeback: {
    name: 'Comeback',
    toast: 'Comeback!',
    body: (low, high) => `Climb back to ${high}% dopamine after dropping below ${low}%.`,
  },
};

const de: BonusMessages = {
  flawless: {
    name: 'Makelloses Level',
    toast: 'Makelloses Level!',
    body: (posts) => `Schaff alle ${posts} Posts eines Levels ohne einen einzigen Fehler.`,
  },
  lightning: {
    name: 'Blitz',
    toast: 'Blitz!',
    body: (run) => `${run} schnelle Wischer oder Likes hintereinander.`,
  },
  coolHead: {
    name: 'Eiskalt',
    toast: 'Eiskalt!',
    body: 'Finger weg vom roten Post, der direkt nach einem Like oder einem Gold-Post kommt.',
  },
  comeback: {
    name: 'Comeback',
    toast: 'Comeback!',
    body: (low, high) =>
      `Fall unter ${low} % Dopamin und kämpf dich zurück auf ${high} %.`,
  },
};

const ar: BonusMessages = {
  flawless: {
    name: 'مستوى مثالي',
    toast: 'مستوى مثالي!',
    body: (posts) => `أنهِ مستوى كاملًا (${posts} منشورًا) دون أي خطأ.`,
  },
  lightning: {
    name: 'برق',
    toast: 'برق!',
    body: (run) => `${run} سحبات سريعة أو إعجابات متتالية.`,
  },
  coolHead: {
    name: 'أعصاب باردة',
    toast: 'أعصاب باردة!',
    body: 'ابعد يدك عن المنشور الأحمر الذي يأتي مباشرة بعد إعجاب أو منشور ذهبي.',
  },
  comeback: {
    name: 'عودة قوية',
    toast: 'عودة قوية!',
    body: (low, high) => `عُد إلى ${high}% من الدوبامين بعد أن تنخفض تحت ${low}%.`,
  },
};

const fr: BonusMessages = {
  flawless: {
    name: 'Niveau parfait',
    toast: 'Niveau parfait !',
    body: (posts) => `Termine les ${posts} posts d'un niveau sans la moindre erreur.`,
  },
  lightning: {
    name: 'Éclair',
    toast: 'Éclair !',
    body: (run) => `${run} swipes rapides ou likes d'affilée.`,
  },
  coolHead: {
    name: 'Sang-froid',
    toast: 'Sang-froid !',
    body: 'Ne touche pas au post rouge qui suit un like ou un post doré.',
  },
  comeback: {
    name: 'Remontada',
    toast: 'Remontada !',
    body: (low, high) =>
      `Remonte à ${high} % de dopamine après être passé sous ${low} %.`,
  },
};

const es: BonusMessages = {
  flawless: {
    name: 'Nivel perfecto',
    toast: '¡Nivel perfecto!',
    body: (posts) => `Completa los ${posts} posts de un nivel sin un solo error.`,
  },
  lightning: {
    name: 'Relámpago',
    toast: '¡Relámpago!',
    body: (run) => `${run} deslizamientos rápidos o me gusta seguidos.`,
  },
  coolHead: {
    name: 'Sangre fría',
    toast: '¡Sangre fría!',
    body: 'No toques el post rojo que llega justo después de un me gusta o un post dorado.',
  },
  comeback: {
    name: 'Remontada',
    toast: '¡Remontada!',
    body: (low, high) =>
      `Vuelve al ${high} % de dopamina después de bajar del ${low} %.`,
  },
};

const ja: BonusMessages = {
  flawless: {
    name: 'ノーミスクリア',
    toast: 'ノーミスクリア！',
    body: (posts) => `レベル内の投稿${posts}個を、1つもミスせずにクリアしよう。`,
  },
  lightning: {
    name: '電光石火',
    toast: '電光石火！',
    body: (run) => `すばやいスワイプかいいねを${run}回連続で。`,
  },
  coolHead: {
    name: '冷静沈着',
    toast: '冷静沈着！',
    body: 'いいねやゴールド投稿のすぐあとに来る赤い投稿では、指を離そう。',
  },
  comeback: {
    name: '大逆転',
    toast: '大逆転！',
    body: (low, high) => `ドーパミンが${low}%を切ったあと、${high}%まで戻そう。`,
  },
};

const ko: BonusMessages = {
  flawless: {
    name: '무결점 레벨',
    toast: '무결점 레벨!',
    body: (posts) => `한 레벨의 게시물 ${posts}개를 실수 없이 끝내세요.`,
  },
  lightning: {
    name: '번개',
    toast: '번개!',
    body: (run) => `빠른 스와이프나 좋아요 ${run}번 연속.`,
  },
  coolHead: {
    name: '평정심',
    toast: '평정심!',
    body: '좋아요나 골드 게시물 바로 다음에 오는 빨간 게시물에서는 손을 떼세요.',
  },
  comeback: {
    name: '대역전',
    toast: '대역전!',
    body: (low, high) => `도파민이 ${low}% 아래로 떨어진 뒤 ${high}%까지 다시 올리세요.`,
  },
};

export const bonus: Record<Locale, BonusMessages> = { tr, en, de, ar, fr, es, ja, ko };
