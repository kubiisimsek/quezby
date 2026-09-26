import { CATALOGS, CONTENT_VERSION, type ContentKind, type Post } from './catalog';
import { SALT, mix } from './mix';

export {
  CATALOGS,
  CONTENT_VERSION,
  type Catalog,
  type ContentKind,
  type Localized,
  type Post,
} from './catalog';
export { SALT, mix } from './mix';

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
