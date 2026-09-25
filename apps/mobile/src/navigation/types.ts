import type { NavigatorScreenParams } from '@react-navigation/native';
import type { RunMode } from '@quezby/types';

/** Every screen's name and params, one list per navigator. */
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  /** A new player's practice run: the game, coached, counted nowhere. */
  Tutorial: undefined;
  Username: undefined;
  /** A new guest's offer to keep the account: Apple, Google or an email. */
  Protect: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Game: { mode: RunMode };
  Help: undefined;
  Daily: undefined;
};

/** The dock, left to right: Zirve, Lig, Oyna (the lobby, in the middle), Arkadaşlar, Profil. */
export type TabParamList = {
  Leaderboard: undefined;
  League: undefined;
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};
