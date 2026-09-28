import type { ContentKind, Draft } from '../../types';
import { HOME_FREEZE, HOME_HOLD, HOME_LIKE, HOME_SKIP } from './home';
import { FOOD_FREEZE, FOOD_HOLD, FOOD_LIKE, FOOD_SKIP } from './food';
import { SCHOOL_FREEZE, SCHOOL_HOLD, SCHOOL_LIKE, SCHOOL_SKIP } from './school';
import { WORK_FREEZE, WORK_HOLD, WORK_LIKE, WORK_SKIP } from './work';
import { FAMILY_FREEZE, FAMILY_HOLD, FAMILY_LIKE, FAMILY_SKIP } from './family';
import { FRIENDS_FREEZE, FRIENDS_HOLD, FRIENDS_LIKE, FRIENDS_SKIP } from './friends';
import { PHONE_FREEZE, PHONE_HOLD, PHONE_LIKE, PHONE_SKIP } from './phone';
import { OUTDOORS_FREEZE, OUTDOORS_HOLD, OUTDOORS_LIKE, OUTDOORS_SKIP } from './outdoors';
import { ANIMALS_FREEZE, ANIMALS_HOLD, ANIMALS_LIKE, ANIMALS_SKIP } from './animals';
import { HOBBIES_FREEZE, HOBBIES_HOLD, HOBBIES_LIKE, HOBBIES_SKIP } from './hobbies';
import { TRAVEL_FREEZE, TRAVEL_HOLD, TRAVEL_LIKE, TRAVEL_SKIP } from './travel';
import { SLEEP_FREEZE, SLEEP_HOLD, SLEEP_LIKE, SLEEP_SKIP } from './sleep';

/**
 * The themed posts, kind by kind, in the order they join the catalog after
 * the format files — fixed once published, like every place in a list.
 */
export const THEME_POSTS: Readonly<Record<ContentKind, readonly Draft[]>> = {
  skip: [
    ...HOME_SKIP,
    ...FOOD_SKIP,
    ...SCHOOL_SKIP,
    ...WORK_SKIP,
    ...FAMILY_SKIP,
    ...FRIENDS_SKIP,
    ...PHONE_SKIP,
    ...OUTDOORS_SKIP,
    ...ANIMALS_SKIP,
    ...HOBBIES_SKIP,
    ...TRAVEL_SKIP,
    ...SLEEP_SKIP,
  ],
  like: [
    ...HOME_LIKE,
    ...FOOD_LIKE,
    ...SCHOOL_LIKE,
    ...WORK_LIKE,
    ...FAMILY_LIKE,
    ...FRIENDS_LIKE,
    ...PHONE_LIKE,
    ...OUTDOORS_LIKE,
    ...ANIMALS_LIKE,
    ...HOBBIES_LIKE,
    ...TRAVEL_LIKE,
    ...SLEEP_LIKE,
  ],
  hold: [
    ...HOME_HOLD,
    ...FOOD_HOLD,
    ...SCHOOL_HOLD,
    ...WORK_HOLD,
    ...FAMILY_HOLD,
    ...FRIENDS_HOLD,
    ...PHONE_HOLD,
    ...OUTDOORS_HOLD,
    ...ANIMALS_HOLD,
    ...HOBBIES_HOLD,
    ...TRAVEL_HOLD,
    ...SLEEP_HOLD,
  ],
  freeze: [
    ...HOME_FREEZE,
    ...FOOD_FREEZE,
    ...SCHOOL_FREEZE,
    ...WORK_FREEZE,
    ...FAMILY_FREEZE,
    ...FRIENDS_FREEZE,
    ...PHONE_FREEZE,
    ...OUTDOORS_FREEZE,
    ...ANIMALS_FREEZE,
    ...HOBBIES_FREEZE,
    ...TRAVEL_FREEZE,
    ...SLEEP_FREEZE,
  ],
};
