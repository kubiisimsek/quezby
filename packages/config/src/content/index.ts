import { CATALOGS, CONTENT_VERSION } from './catalog';
import { SALT, mix } from './mix';
import type { ContentKind, Post } from './types';

export { CATALOGS, CONTENT_VERSION } from './catalog';
export { ACCOUNTS } from './accounts';
export { AVATARS, NOTICES, RECEIPT_ITEMS, STICKERS } from './pools';
export { SALT, mix } from './mix';
export {
  FORMATS_OF,
  type Catalog,
  type ChartAxis,
  type ChartShape,
  type ChatLine,
  type ContentKind,
  type Draft,
  type Localized,
  type Notice,
  type Post,
  type PostBody,
  type PostFormat,
} from './types';

/** Every post in a catalog version, by id. */
export function postsOf(version: number = CONTENT_VERSION): ReadonlyMap<string, Post> {
  const catalog = CATALOGS[version];
  if (!catalog) throw new Error(`no content catalog v${version}`);
  return new Map(Object.values(catalog).flat().map((post) => [post.id, post]));
}

/** The post reel `index` of the run with `seed` shows — the same pick the API makes. */
export function postFor(
  seed: number,
  index: number,
  kind: ContentKind,
  version: number = CONTENT_VERSION,
): Post {
  const list = CATALOGS[version]?.[kind];
  if (!list || list.length === 0) throw new Error(`no ${kind} posts in content catalog v${version}`);
  return list[mix(seed, index, SALT.post) % list.length] as Post;
}
