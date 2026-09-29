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
  /** A new player's practice run: the game, coached, counted nowhere. */
  Tutorial: undefined;
  /** The ways in on a phone with no account: email and password, sign-up, Apple, Google, a guest. */
  SignIn: { email?: string } | undefined;
  /** A new email account: email, password twice. */
  Register: { email?: string } | undefined;
  /** The code emailed to a new account's address; `resendIn` is the API's wait before a new one. */
  VerifyEmail: { email: string; resendIn?: number };
  /** A forgotten password: a code to the email, then the new password. */
  ForgotPassword: { email?: string } | undefined;
  Username: undefined;
  /** A new account's question: may the game count how it is used? */
  Consent: undefined;
  /** A new account's question: may the game send notifications? */
  Notifications: undefined;
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
