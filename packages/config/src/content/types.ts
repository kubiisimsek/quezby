import type { Locale } from '@quezby/types';

/**
 * The shapes of the feed's content. A post is one joke — its account, its
 * caption and what it is drawn as — and its `body` names a **format**: a chat
 * screenshot, a poll, a receipt… The app draws each format in the kind's own
 * colours and dresses it from the seed (pattern, tilt, the parts it borrows
 * from `pools.ts`), so one post rarely looks the same twice. None of it
 * reaches the rules or the API: the API only counts posts by id.
 */
export type ContentKind = 'skip' | 'like' | 'hold' | 'freeze';

/** One line in each of the six languages the game speaks. */
export type Localized = Readonly<Record<Locale, string>>;

/** How a post is drawn. Every format belongs to the kinds in `FORMATS_OF`. */
export type PostFormat =
  | 'scene'
  | 'chat'
  | 'poll'
  | 'chart'
  | 'receipt'
  | 'fact'
  | 'tier'
  | 'notifications'
  | 'quote'
  | 'polaroid'
  | 'dump'
  | 'treasure'
  | 'sign'
  | 'cctv';

/** One message of a chat screenshot: `me` is the account that posted it. */
export type ChatLine = { readonly from: 'me' | 'them'; readonly text: Localized };

/** A notification on a lock screen: the app (or person) it came from and what it says. */
export type Notice = { readonly icon: string; readonly app: Localized; readonly text: Localized };

/** Where a chart's line goes, left to right. */
export type ChartShape = 'fall' | 'rise' | 'crash' | 'spike' | 'flat' | 'zigzag';

/** What a chart's x axis counts. The app writes the labels. */
export type ChartAxis = 'days' | 'hours' | 'months';

/**
 * What a format needs besides the post's emoji and caption. Words a player
 * reads are `Localized`; a number shown big is written out in each language
 * (`2.617`, `2,617`, `2 617`) with the same digits.
 */
export type PostBody =
  /** The emoji as a photo: framed, cropped, tiled or under a spotlight — the dress decides. */
  | { readonly format: 'scene' }
  /** A chat screenshot: who it is with and 2–5 messages, the punchline last. */
  | { readonly format: 'chat'; readonly contact: Localized; readonly lines: readonly ChatLine[] }
  /** A poll: a question, two or three answers and the one that wins. */
  | {
      readonly format: 'poll';
      readonly question: Localized;
      readonly options: readonly Localized[];
      readonly winner: number;
    }
  /** A line chart: its title, an optional big figure and the line's shape. */
  | {
      readonly format: 'chart';
      readonly title: Localized;
      readonly value: Localized | null;
      readonly shape: ChartShape;
      readonly axis: ChartAxis;
    }
  /** A shop receipt: the shop and the one or two items the joke is about; the rest is filler. */
  | { readonly format: 'receipt'; readonly store: Localized; readonly items: readonly Localized[] }
  /** A big number and what it counts; the eyebrow defaults to "did you know?". */
  | {
      readonly format: 'fact';
      readonly eyebrow: Localized | null;
      readonly big: Localized;
      readonly text: Localized;
    }
  /** A tier list: its title and the S, A, B and C rows, emoji only. */
  | { readonly format: 'tier'; readonly title: Localized; readonly rows: readonly (readonly string[])[] }
  /** A lock screen: the punchline notification on top of a few ordinary ones. */
  | { readonly format: 'notifications'; readonly first: Notice }
  /** A quote card: the words big, in quotation marks. */
  | { readonly format: 'quote'; readonly text: Localized }
  /** A friend's instant photo: the emoji in a white frame and a note written under it. */
  | { readonly format: 'polaroid'; readonly note: Localized }
  /** A friend's photo dump: four of these emojis, in an order the dress picks. */
  | { readonly format: 'dump'; readonly emojis: readonly string[] }
  /** A gold post's prize: the emoji on a pedestal in a burst of light. */
  | { readonly format: 'treasure' }
  /** A warning sign: its big word and the small line under it, in capitals. */
  | { readonly format: 'sign'; readonly sign: Localized; readonly small: Localized }
  /** A security camera frame: the room it watches. */
  | { readonly format: 'cctv'; readonly place: Localized };

export type Post = {
  /** `like-007`: its kind and place in the list — the same post for as long as the catalog lives. */
  readonly id: string;
  /** Its face: drawn by most formats, and the post's thumbnail on the profile and in the panel. */
  readonly emoji: string;
  /**
   * The account that posted it, a local in every language — written like a
   * player's name (a–z, 0–9, `.` and `*`), so Arabic's are transliterated.
   */
  readonly user: Localized;
  readonly caption: Localized;
  /** Freeze reels shout a headline instead of a caption. */
  readonly headline: Localized | null;
  readonly body: PostBody;
};

/** A post as it is written, before the catalog gives it its id. */
export type Draft = Omit<Post, 'id' | 'headline'> & { readonly headline?: Localized };

export type Catalog = Readonly<Record<ContentKind, readonly Post[]>>;

/** Which formats a kind may wear: the kind still reads from its colour first. */
export const FORMATS_OF: Readonly<Record<ContentKind, readonly PostFormat[]>> = {
  skip: ['scene', 'chat', 'poll', 'chart', 'receipt', 'fact', 'tier', 'notifications', 'quote'],
  like: ['scene', 'polaroid', 'dump'],
  hold: ['treasure'],
  freeze: ['sign', 'cctv'],
};
