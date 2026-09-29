import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * A run to play: Normal, today's challenge or Dereceli — or a VS with a
 * friend, sent (`opponent` alone) or answered (`duelId`, the one they sent).
 */
export type GameParams =
  | { mode: 'free' | 'daily' | 'rated' }
  | { mode: 'vs'; opponent: string; duelId?: string };

/** The two sides of the Mesajlar tab. */
export type InboxSegment = 'messages' | 'friends';

/** Every screen's name and params, one list per navigator. */
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  /** A new player's practice run: the game, coached, counted nowhere. */
  Tutorial: undefined;
  Username: undefined;
  /** A new player's question: may the game send notifications? */
  Notifications: undefined;
  /** A new guest's offer to keep the account: Apple, Google or an email. */
  Protect: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Game: GameParams;
  Help: undefined;
  Daily: undefined;
  /** Finding a player by name, and the requests the player sent. */
  FindFriends: undefined;
  /** The conversation with a friend: its VS, its lines, the phrases. */
  Thread: { username: string };
  /**
   * A friend list: the player's own (no username) with the requests waiting
   * for them, or a friend's — shown only to that player's friends.
   */
  Friends: { username?: string } | undefined;
  /** Ayarlar → Hesap bilgileri: the name, the ways in, deleting the account. */
  Account: undefined;
  /** The bell on the lobby: requests, VS and what became of them. */
  Alerts: undefined;
  /** Every run the player finished. */
  History: undefined;
  /** Framing a photo from the library before it becomes the profile photo. */
  AvatarEditor: { uri: string; width: number; height: number };
};

/** The dock, left to right: Zirve, Lig, Oyna (the lobby, in the middle), Mesajlar, Profil. */
export type TabParamList = {
  Leaderboard: undefined;
  League: undefined;
  Home: undefined;
  /**
   * Mesajlar, in two: the conversations, and the friends — search, requests,
   * the list. `segment` opens the second from elsewhere (the profile's counter).
   */
  Inbox: { segment?: InboxSegment } | undefined;
  Profile: undefined;
};
