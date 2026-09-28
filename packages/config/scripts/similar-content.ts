/**
 * Posts that may tell the same joke: pairs whose Turkish words overlap most,
 * across the whole catalog. A tool for writers, not a test — two posts about
 * the same fridge can be two jokes. Read the pairs, keep the ones that are.
 *
 *   pnpm --filter @quezby/config exec tsx scripts/similar-content.ts
 *   pnpm --filter @quezby/config exec tsx scripts/similar-content.ts src/content/posts/themes/home.ts
 *
 * With a file, only the pairs that involve one of its posts are listed.
 */
import { resolve } from 'node:path';

import { CATALOGS, CONTENT_VERSION } from '../src/content';
import type { Draft, Localized, Post } from '../src/content/types';

/** Words too common in the feed's jokes to say two posts are alike. */
const STOP = new Set(
  (
    've veya ile bir bu şu o da de mi mı mu mü ben sen biz siz onlar benim senin bana sana beni seni çok daha en ' +
    'gibi için ama ki ne her hiç sonra önce kadar hep bile yine artık şimdi bugün diye olan olarak var yok oldu ' +
    'olur gün kez saat dakika tane tüm bütün hâlâ hala sadece bizim sizin onun kendi değil evet hayır tamam'
  ).split(' '),
);

/** Stems every red post shares ("Kıpırdama. Dokunma."), which say nothing about its joke. */
const STOP_STEMS = new Set(['kıpır', 'dokun']);

/** A post's Turkish words, cut to five letters so a suffix does not hide a repeat. */
function stemsOf(post: Post): Set<string> {
  const lines: Localized[] = [post.caption];
  if (post.headline) lines.push(post.headline);
  const body = post.body;
  if (body.format === 'chat') lines.push(...body.lines.map((line) => line.text));
  if (body.format === 'poll') lines.push(body.question, ...body.options);
  if (body.format === 'chart') lines.push(body.title);
  if (body.format === 'receipt') lines.push(...body.items);
  if (body.format === 'fact') lines.push(body.text);
  if (body.format === 'notifications') lines.push(body.first.text);
  if (body.format === 'quote') lines.push(body.text);
  if (body.format === 'polaroid') lines.push(body.note);
  if (body.format === 'sign') lines.push(body.sign, body.small);
  const words = lines
    .map((line) => line.tr.toLocaleLowerCase('tr'))
    .join(' ')
    .replace(/[^a-zçğıöşüâîû0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP.has(word));
  return new Set(words.map((word) => word.slice(0, 5)).filter((stem) => !STOP_STEMS.has(stem)));
}

async function main(): Promise<void> {
  const catalog = CATALOGS[CONTENT_VERSION]!;
  const posts = Object.values(catalog).flat();
  const stems = posts.map(stemsOf);

  let mine: Set<Localized> | null = null;
  const file = process.argv[2];
  if (file) {
    const module = (await import(resolve(file))) as Record<string, readonly Draft[]>;
    mine = new Set(Object.values(module).flat().map((draft) => draft.caption));
  }

  const pairs: { score: number; a: Post; b: Post; shared: string[] }[] = [];
  for (let i = 0; i < posts.length; i += 1) {
    for (let j = i + 1; j < posts.length; j += 1) {
      const a = posts[i]!;
      const b = posts[j]!;
      if (mine && !mine.has(a.caption) && !mine.has(b.caption)) continue;
      const left = stems[i]!;
      const right = stems[j]!;
      const shared = [...left].filter((stem) => right.has(stem));
      if (shared.length < 2) continue;
      const score = shared.length / new Set([...left, ...right]).size;
      if (score >= 0.3) pairs.push({ score, a, b, shared });
    }
  }
  pairs.sort((x, y) => y.score - x.score);
  const say = (post: Post) => `${post.id} ${post.emoji} “${post.headline?.tr ?? post.caption.tr}”`;
  for (const { score, a, b, shared } of pairs) {
    console.log(`${score.toFixed(2)}  ${say(a)}  ↔  ${say(b)}   [${shared.join(', ')}]`);
  }
  console.log(`${pairs.length} pair(s) to read`);
}

void main();
