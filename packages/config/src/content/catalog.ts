import { CLASSIC_FREEZE, CLASSIC_HOLD, CLASSIC_LIKE, CLASSIC_SKIP } from './posts/classic';
import { FREEZE_CCTV } from './posts/freeze-cctv';
import { FREEZE_SIGN } from './posts/freeze-sign';
import { HOLD_TREASURE } from './posts/hold-treasure';
import { LIKE_DUMP } from './posts/like-dump';
import { LIKE_POLAROID } from './posts/like-polaroid';
import { LIKE_SCENE } from './posts/like-scene';
import { SKIP_CHART } from './posts/skip-chart';
import { SKIP_CHAT } from './posts/skip-chat';
import { SKIP_FACT } from './posts/skip-fact';
import { SKIP_NOTIFICATIONS } from './posts/skip-notifications';
import { SKIP_POLL } from './posts/skip-poll';
import { SKIP_QUOTE } from './posts/skip-quote';
import { SKIP_RECEIPT } from './posts/skip-receipt';
import { SKIP_SCENE } from './posts/skip-scene';
import { SKIP_TIER } from './posts/skip-tier';
import { THEME_POSTS } from './posts/themes';
import type { Catalog, ContentKind, Draft, Post } from './types';

/**
 * What the feed shows: fake posts, one list per reel kind. A post's id is its
 * kind and its place in the list, so a catalog is **append-only** — a new
 * post goes at the end, never in the middle. The API only needs each list's
 * length (`app/Content/Catalog.php`), tested against `fixtures/content.json`,
 * to know which post every reel wore; the fixtures also keep each id's emoji
 * and format, so a post can never slip into another's place.
 *
 * A post speaks the game's six languages, Turkish first. Its words are
 * transcreated, not translated: a caption is a joke about the scrolling
 * habit, and each language gets one that lands in it, about as short as the
 * Turkish (`docs/design/ui-writing.md`). Words and looks never reach the API.
 */

function listOf(kind: ContentKind, drafts: readonly Draft[]): readonly Post[] {
  return drafts.map((draft, i) => ({
    id: `${kind}-${String(i + 1).padStart(3, '0')}`,
    emoji: draft.emoji,
    user: draft.user,
    caption: draft.caption,
    headline: draft.headline ?? null,
    body: draft.body,
  }));
}

/**
 * Catalog v1: the feed's first posts in their places, then each format's own,
 * then the themes' (`posts/themes`).
 */
const V1: Catalog = {
  skip: listOf('skip', [
    ...CLASSIC_SKIP,
    ...SKIP_SCENE,
    ...SKIP_CHAT,
    ...SKIP_POLL,
    ...SKIP_CHART,
    ...SKIP_RECEIPT,
    ...SKIP_FACT,
    ...SKIP_TIER,
    ...SKIP_NOTIFICATIONS,
    ...SKIP_QUOTE,
    ...THEME_POSTS.skip,
  ]),
  like: listOf('like', [...CLASSIC_LIKE, ...LIKE_SCENE, ...LIKE_POLAROID, ...LIKE_DUMP, ...THEME_POSTS.like]),
  hold: listOf('hold', [...CLASSIC_HOLD, ...HOLD_TREASURE, ...THEME_POSTS.hold]),
  freeze: listOf('freeze', [...CLASSIC_FREEZE, ...FREEZE_SIGN, ...FREEZE_CCTV, ...THEME_POSTS.freeze]),
};

/**
 * The version a run was started with; the server credits posts from the same
 * catalog. Still 1 while the game is on staging: until the first store
 * release a list grows in place — at its end, so an id keeps naming the same
 * post. Once players outside staging have the app, a list that grows is a new
 * version (theirs keeps its lengths).
 */
export const CONTENT_VERSION = 1;

export const CATALOGS: Readonly<Record<number, Catalog>> = { 1: V1 };
