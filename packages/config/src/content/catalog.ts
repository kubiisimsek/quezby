/**
 * What the feed shows: fake posts, one list per reel kind. A post's id is its
 * kind and its place in the list, so a catalog is **append-only** — a new
 * post goes at the end of a new version, never in the middle of an old one.
 * The API only needs each list's length (`app/Content/Catalog.php`), tested
 * against `fixtures/content.json`, to know which post every reel wore.
 */
export type ContentKind = 'skip' | 'like' | 'hold' | 'freeze';

export type Post = {
  /** `like-007`: stable forever within its version. */
  id: string;
  emoji: string;
  user: string;
  caption: string;
  /** Freeze reels shout a headline instead of a caption. */
  headline: string | null;
};

type Draft = Omit<Post, 'id' | 'headline'> & { headline?: string };

const SKIP: Draft[] = [
  { emoji: '☕️', user: '@gunluk.vlog', caption: 'POV: pazartesi sabahı' },
  { emoji: '🍝', user: '@yemek.defteri', caption: 'Bugün ne yedim? Makarna. Yine.' },
  { emoji: '🧊', user: '@evden.notlar', caption: 'Kimse sormadı ama kahvem soğudu' },
  { emoji: '🔁', user: '@siradan.hesap', caption: 'Rutinim: uyan, kaydır, uyu' },
  { emoji: '⏱️', user: '@hayat.hilesi', caption: '5 dakikalık hayat hilesi (4 dk reklam)' },
  { emoji: '📉', user: '@trend.avcisi', caption: 'Bunu izleyenlerin %97’si kaydırdı' },
  { emoji: '🧦', user: '@evden.notlar', caption: 'Çorap eşleştirme challenge #3' },
  { emoji: '🚌', user: '@gunluk.vlog', caption: 'Otobüs yine gelmedi, vlog' },
  { emoji: '🥬', user: '@siradan.hesap', caption: 'Buzdolabını açıp kapattım' },
  { emoji: '📺', user: '@bilgi.kutusu', caption: 'Dizi önerisi: yok' },
  { emoji: '🎵', user: '@trend.avcisi', caption: 'Bu ses trend olacak (olmayacak)' },
  { emoji: '🛋️', user: '@motivasyon.34', caption: 'Motivasyon: yarın başlarım' },
  { emoji: '🧾', user: '@sessiz.asmr', caption: 'Market fişi ASMR' },
  { emoji: '🌧️', user: '@sessiz.asmr', caption: 'Yağmur sesi, 10 saat' },
  { emoji: '🥪', user: '@yemek.defteri', caption: 'Tost makinesi incelemesi' },
  { emoji: '🗂️', user: '@evden.notlar', caption: 'Masa düzenleme ama sessiz' },
  { emoji: '🥱', user: '@gunluk.vlog', caption: 'Günaydın ama öğleden sonra' },
  { emoji: '🪴', user: '@bilgi.kutusu', caption: 'Kedimin kediliği (kedim yok)' },
];

const LIKE: Draft[] = [
  { emoji: '🐱', user: '@zeynep.k', caption: 'kedim yine beni yargılıyor' },
  { emoji: '🎂', user: '@kanka.ali', caption: 'doğum günümdü, beğenmeyen küs' },
  { emoji: '🍳', user: '@elif.ay', caption: 'ilk yemeğim, yorum yapmayın' },
  { emoji: '🏖️', user: '@ece.su', caption: 'tatil fotoğrafı (sonunda)' },
  { emoji: '🐶', user: '@burak.07', caption: 'köpeğim diploma aldı' },
  { emoji: '💇', user: '@deniz*m', caption: 'yeni saç, dürüst olun' },
  { emoji: '🎤', user: '@can.can', caption: 'konserdeydim!!!' },
  { emoji: '🥟', user: '@mert*34', caption: 'annemin böreği >>>' },
  { emoji: '🐰', user: '@ece.su', caption: 'tavşanımın adı Havuç' },
  { emoji: '🦦', user: '@zeynep.k', caption: 'en sevdiğim hayvan, tartışmaya kapalı' },
];

const HOLD: Draft[] = [
  { emoji: '💎', user: '@nadir.icerik', caption: 'Sonuna kadar izleyen kazanır' },
  { emoji: '👑', user: '@altin.reel', caption: 'Nadir içerik, kaçırma' },
  { emoji: '🍀', user: '@hazine*avcisi', caption: 'Bu reel %1 şanslı kişiye çıkar' },
  { emoji: '🏆', user: '@hazine*avcisi', caption: 'Hazine sandığı açılıyor' },
  { emoji: '⏳', user: '@altin.reel', caption: 'Tam zamanında bırakan kazanır' },
  { emoji: '🪙', user: '@nadir.icerik', caption: 'Altın an, doğru saniye' },
];

const FREEZE: Draft[] = [
  { emoji: '👀', user: '@canli.yayin', caption: 'Kıpırdama. Dokunma.', headline: 'Annen odaya girdi' },
  { emoji: '🫣', user: '@canli.yayin', caption: 'Kıpırdama. Dokunma.', headline: 'Patron arkanda' },
  { emoji: '👩‍🏫', user: '@canli.yayin', caption: 'Kıpırdama. Dokunma.', headline: 'Hoca bakıyor' },
  { emoji: '🧍', user: '@canli.yayin', caption: 'Kıpırdama. Dokunma.', headline: 'Babanın ayak sesleri' },
  { emoji: '🚨', user: '@canli.yayin', caption: 'Kıpırdama. Dokunma.', headline: 'Ekran süresi uyarısı' },
];

function listOf(kind: ContentKind, drafts: Draft[]): readonly Post[] {
  return drafts.map((draft, i) => ({
    id: `${kind}-${String(i + 1).padStart(3, '0')}`,
    emoji: draft.emoji,
    user: draft.user,
    caption: draft.caption,
    headline: draft.headline ?? null,
  }));
}

export type Catalog = Readonly<Record<ContentKind, readonly Post[]>>;

/** The version a run was started with; the server credits posts from the same catalog. */
export const CONTENT_VERSION = 1;

export const CATALOGS: Readonly<Record<number, Catalog>> = {
  1: {
    skip: listOf('skip', SKIP),
    like: listOf('like', LIKE),
    hold: listOf('hold', HOLD),
    freeze: listOf('freeze', FREEZE),
  },
};
