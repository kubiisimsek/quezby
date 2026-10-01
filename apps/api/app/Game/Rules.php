<?php

namespace App\Game;

/**
 * Every number that decides a run — the PHP twin of
 * `packages/engine/src/rules.ts`. Integer arithmetic only: every `Math.floor`
 * there is an `intdiv` on non-negative integers here. The rules are locked
 * (`packages/engine/rules.lock.json`, checked by `tests/Unit/RulesLockTest.php`):
 * changing any value is an `ENGINE_VERSION` bump in both engines, a new
 * fixture set and a new leaderboard season — or, before the first store
 * release, the same version re-sealed in place (`pnpm engine:lock -- --reseal`).
 */
final class Rules
{
    public const ENGINE_VERSION = 3;

    public const WINDOW_MAX = 2200;

    public const WINDOW_MIN = 600;

    public const CURVE = 70;

    public const LIKE_EXTRA = 250;

    public const FREEZE_PERCENT = 45;

    public const FREEZE_MIN = 400;

    public const HOLD_FILL_MAX = 1200;

    public const HOLD_FILL_MIN = 600;

    public const ZONE_MAX = 200;

    public const ZONE_MIN = 90;

    public const ZONE_CENTER_MIN = 450;

    public const ZONE_CENTER_SPAN = 401;

    public const SPECIAL_BASE = 250;

    public const SPECIAL_GAIN = 250;

    public const SPECIAL_CURVE = 150;

    public const WEIGHT_LIKE = 40;

    public const WEIGHT_HOLD = 30;

    public const MAX_SPECIAL_RUN = 3;

    /**
     * The most holds and freezes any `CAP_WINDOW` reels in a row may hold, by
     * the reel the run has reached: one each at first, a second freeze from
     * level 9, a second hold from level 17. A pick past its cap, or a freeze
     * right after a freeze, is an ordinary reel.
     */
    public const CAP_WINDOW = 10;

    /** @var list<array{fromReel: int, hold: int, freeze: int}> */
    public const CAPS = [
        ['fromReel' => 0, 'hold' => 1, 'freeze' => 1],
        ['fromReel' => 160, 'hold' => 1, 'freeze' => 2],
        ['fromReel' => 320, 'hold' => 2, 'freeze' => 2],
    ];

    /** @var list<ReelKind> */
    public const INTRO = [
        ReelKind::Skip,
        ReelKind::Skip,
        ReelKind::Like,
        ReelKind::Skip,
        ReelKind::Hold,
        ReelKind::Skip,
        ReelKind::Freeze,
        ReelKind::Skip,
    ];

    public const METER_MAX = 1000;

    /**
     * Drain per second, per-mille: `base + n · num / den + n² / quad` — by the
     * sixth minute the best thumb cannot keep up.
     */
    public const DRAIN_BASE = 60;

    public const DRAIN_NUM = 1;

    public const DRAIN_DEN = 6;

    public const DRAIN_QUAD = 3000;

    /** Meter gained per hit, keyed by `ReelKind` value. */
    public const GAIN = ['skip' => 80, 'like' => 90, 'hold' => 100, 'freeze' => 90];

    public const PERFECT_GAIN = 60;

    public const LOSS_TIMEOUT = 250;

    public const LOSS_WRONG = 250;

    public const LOSS_HOLD_MISS = 150;

    public const LOSS_CAUGHT = 300;

    /**
     * A blind move: a swipe or a double tap on the wrong post, made sooner
     * than this — too soon to have looked. The first costs the plain loss;
     * each one after it doubles (x2, x4…) until a considered hit, so the
     * third in a row always empties the meter.
     */
    public const BLIND_MS = 300;

    /** Points before multipliers, keyed by `ReelKind` value. */
    public const BASE = ['skip' => 100, 'like' => 120, 'hold' => 150, 'freeze' => 120];

    public const SPEED_FLOOR = 250;

    public const PRECISION_BONUS = 150;

    public const PERFECT_PRECISION = 700;

    public const LEVEL_EVERY = 20;

    /** The level multiplier climbs this much per level, per-mille: x2.8 at level 10, x4.8 at 20. */
    public const LEVEL_BOOST_STEP = 200;

    public const COMBO_START = 1000;

    public const COMBO_STEP = 50;

    public const COMBO_MAX = 1500;

    /** Named combos, keyed by `BonusKind` value, worth `value · level multiplier / 1000`. */
    public const BONUS = ['flawless' => 1500, 'lightning' => 500, 'coolHead' => 300, 'comeback' => 1000];

    public const LIGHTNING_RUN = 5;

    /** Decision limits for a lightning hit, keyed by `ReelKind` value. */
    public const LIGHTNING_MS = ['skip' => 550, 'like' => 700];

    public const COMEBACK_LOW = 300;

    public const COMEBACK_HIGH = 500;

    private static function onCurve(int $n, int $min, int $max): int
    {
        return $min + intdiv(($max - $min) * self::CURVE, self::CURVE + $n);
    }

    /** Milliseconds the player has to act on reel `$n`. */
    public static function baseWindow(int $n): int
    {
        return self::onCurve($n, self::WINDOW_MIN, self::WINDOW_MAX);
    }

    public static function windowFor(ReelKind $kind, int $n): int
    {
        $base = self::baseWindow($n);

        return match ($kind) {
            ReelKind::Like => $base + self::LIKE_EXTRA,
            ReelKind::Freeze => max(self::FREEZE_MIN, intdiv($base * self::FREEZE_PERCENT, 100)),
            default => $base,
        };
    }

    public static function holdFillFor(int $n): int
    {
        return self::onCurve($n, self::HOLD_FILL_MIN, self::HOLD_FILL_MAX);
    }

    public static function zoneWidthFor(int $n): int
    {
        return self::onCurve($n, self::ZONE_MIN, self::ZONE_MAX);
    }

    public static function specialShareFor(int $n): int
    {
        return self::SPECIAL_BASE + intdiv(self::SPECIAL_GAIN * $n, $n + self::SPECIAL_CURVE);
    }

    /** Meter lost per second on reel `$n`, in per-mille. */
    public static function drainFor(int $n): int
    {
        return self::DRAIN_BASE + intdiv($n * self::DRAIN_NUM, self::DRAIN_DEN) + intdiv($n * $n, self::DRAIN_QUAD);
    }

    /**
     * The most holds and freezes the `CAP_WINDOW` reels ending at reel `$n` may hold.
     *
     * @return array{fromReel: int, hold: int, freeze: int}
     */
    public static function capsFor(int $n): array
    {
        $caps = self::CAPS[0];
        foreach (self::CAPS as $tier) {
            if ($n >= $tier['fromReel']) {
                $caps = $tier;
            }
        }

        return $caps;
    }

    public static function levelFor(int $n): int
    {
        return 1 + intdiv($n, self::LEVEL_EVERY);
    }

    /** The level multiplier on reel `$n`, per-mille: 1000 on level 1, `LEVEL_BOOST_STEP` more each level. */
    public static function levelBoostFor(int $n): int
    {
        return 1000 + self::LEVEL_BOOST_STEP * intdiv($n, self::LEVEL_EVERY);
    }

    /** The combo after a hit, per-mille. */
    public static function comboAfterHit(int $combo): int
    {
        return min(self::COMBO_MAX, $combo + self::COMBO_STEP);
    }

    /** The combo after a miss: whatever was above x1 is halved. */
    public static function comboAfterMiss(int $combo): int
    {
        return self::COMBO_START + intdiv($combo - self::COMBO_START, 2);
    }

    /**
     * What a blind move multiplies its loss by: 1 for the first in a row,
     * then 2, 4… — `$blind` is 0 for a miss that was not blind.
     */
    public static function blindFactor(int $blind): int
    {
        return 2 ** max(0, $blind - 1);
    }

    /** What a miss costs the meter: `$loss`, times its blind factor. */
    public static function penaltyFor(int $loss, int $blind): int
    {
        return $loss * self::blindFactor($blind);
    }

    /** A named combo's points on reel `$n`. */
    public static function bonusFor(BonusKind $kind, int $n): int
    {
        return intdiv(self::BONUS[$kind->value] * self::levelBoostFor($n), 1000);
    }

    /**
     * The rules as the TypeScript `RULES` object, key for key — what the lock
     * hashes. `RulesLockTest` compares it with `packages/engine/fixtures/rules.json`.
     *
     * @return array<string, mixed>
     */
    public static function toArray(): array
    {
        return [
            'windowMax' => self::WINDOW_MAX,
            'windowMin' => self::WINDOW_MIN,
            'curve' => self::CURVE,
            'likeExtra' => self::LIKE_EXTRA,
            'freezePercent' => self::FREEZE_PERCENT,
            'freezeMin' => self::FREEZE_MIN,
            'holdFillMax' => self::HOLD_FILL_MAX,
            'holdFillMin' => self::HOLD_FILL_MIN,
            'zoneMax' => self::ZONE_MAX,
            'zoneMin' => self::ZONE_MIN,
            'zoneCenterMin' => self::ZONE_CENTER_MIN,
            'zoneCenterSpan' => self::ZONE_CENTER_SPAN,
            'specialBase' => self::SPECIAL_BASE,
            'specialGain' => self::SPECIAL_GAIN,
            'specialCurve' => self::SPECIAL_CURVE,
            'weightLike' => self::WEIGHT_LIKE,
            'weightHold' => self::WEIGHT_HOLD,
            'maxSpecialRun' => self::MAX_SPECIAL_RUN,
            'capWindow' => self::CAP_WINDOW,
            'caps' => self::CAPS,
            'intro' => array_map(fn (ReelKind $kind) => $kind->value, self::INTRO),
            'meterMax' => self::METER_MAX,
            'drainBase' => self::DRAIN_BASE,
            'drainNum' => self::DRAIN_NUM,
            'drainDen' => self::DRAIN_DEN,
            'drainQuad' => self::DRAIN_QUAD,
            'gain' => self::GAIN,
            'perfectGain' => self::PERFECT_GAIN,
            'loss' => [
                'timeout' => self::LOSS_TIMEOUT,
                'wrong' => self::LOSS_WRONG,
                'holdMiss' => self::LOSS_HOLD_MISS,
                'caught' => self::LOSS_CAUGHT,
            ],
            'blindMs' => self::BLIND_MS,
            'base' => self::BASE,
            'speedFloor' => self::SPEED_FLOOR,
            'precisionBonus' => self::PRECISION_BONUS,
            'perfectPrecision' => self::PERFECT_PRECISION,
            'levelEvery' => self::LEVEL_EVERY,
            'levelBoostStep' => self::LEVEL_BOOST_STEP,
            'comboStart' => self::COMBO_START,
            'comboStep' => self::COMBO_STEP,
            'comboMax' => self::COMBO_MAX,
            'bonus' => self::BONUS,
            'lightningRun' => self::LIGHTNING_RUN,
            'lightningMs' => self::LIGHTNING_MS,
            'comebackLow' => self::COMEBACK_LOW,
            'comebackHigh' => self::COMEBACK_HIGH,
        ];
    }

    /**
     * The TypeScript `canonicalJson`: keys sorted at every depth, no
     * whitespace, so both sides hash the same bytes.
     */
    public static function canonicalJson(mixed $value): string
    {
        if (is_array($value)) {
            if (array_is_list($value)) {
                return '['.implode(',', array_map(self::canonicalJson(...), $value)).']';
            }
            ksort($value, SORT_STRING);
            $pairs = [];
            foreach ($value as $key => $item) {
                $pairs[] = json_encode((string) $key, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
                    .':'.self::canonicalJson($item);
            }

            return '{'.implode(',', $pairs).'}';
        }

        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
