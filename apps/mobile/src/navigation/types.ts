import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * A run to play: free play or today's challenge — or a VS with a friend,
 * sent (`opponent` alone) or answered (`duelId`, the one they sent).
 */
export type GameParams =
  | { mode: 'free' | 'daily' }
  | { mode: 'vs'; opponent: string; duelId?: string };

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
  /** Every run the player finished. */
  History: undefined;
  /** Framing a photo from the library before it becomes the profile photo. */
  AvatarEditor: { uri: string; width: number; height: number };
};

/** The dock, left to right: Zirve, Lig, Oyna (the lobby, in the middle), Arkadaşlar, Profil. */
export type TabParamList = {
  Leaderboard: undefined;
  League: undefined;
  Home: undefined;
  Friends: undefined;
  Profile: undefined;
};
