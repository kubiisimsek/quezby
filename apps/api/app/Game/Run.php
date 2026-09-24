<?php

namespace App\Game;

/**
 * One run, one reel at a time — the PHP twin of `packages/engine/src/run.ts`.
 * The API feeds it a finished run's actions and must land on the same summary
 * as the app, so every check below runs in the same order as there.
 */
final class Run
{
    private const MAX_MS = 60000;

    private const MASK = 0xFFFFFFFF;

    public readonly int $seed;

    private readonly ReelStream $stream;

    private Reel $reel;

    private int $meter = Rules::METER_MAX;

    private int $score = 0;

    private int $reels = 0;

    private int $hits = 0;

    private int $misses = 0;

    private int $perfects = 0;

    private int $streak = 0;

    private int $maxStreak = 0;

    private int $reactionSum = 0;

    private int $reactionCount = 0;

    private int $activeMs = 0;

    private ?EndReason $ended = null;

    private int $combo = Rules::COMBO_START;

    private int $maxCombo = Rules::COMBO_START;

    /** No miss yet on the level the current reel belongs to. */
    private bool $levelClean = true;

    /** Fast skip and like hits in a row, towards the next lightning. */
    private int $lightningRun = 0;

    /** The kind of the previous reel when it was a hit. */
    private ?ReelKind $previousHit = null;

    /** The meter ended a reel below `COMEBACK_LOW` and has not climbed back yet. */
    private bool $lowMeter = false;

    private int $bonusPoints = 0;

    /** @var array{flawless: int, lightning: int, coolHead: int, comeback: int} */
    private array $bonusCounts = ['flawless' => 0, 'lightning' => 0, 'coolHead' => 0, 'comeback' => 0];

    public function __construct(int $seed)
    {
        $this->seed = $seed & self::MASK;
        $this->stream = new ReelStream($this->seed);
        $this->reel = $this->stream->next();
    }

    /**
     * Replays a finished run's log from its seed. A log that stops before the
     * run ended is a run the player quit.
     *
     * @param  array<mixed>  $actions
     *
     * @throws EngineError on a log the app could not have produced
     */
    public static function replay(int $seed, array $actions): Replay
    {
        $run = new self($seed);
        $steps = [];
        foreach ($actions as $action) {
            $steps[] = $run->apply($action);
        }
        $run->quit();

        return new Replay($run->summary(), $steps);
    }

    public function current(): Reel
    {
        return $this->reel;
    }

    public function meter(): int
    {
        return $this->meter;
    }

    public function points(): int
    {
        return $this->score;
    }

    public function currentStreak(): int
    {
        return $this->streak;
    }

    /** The combo the next hit builds on, per-mille. */
    public function currentCombo(): int
    {
        return $this->combo;
    }

    public function isOver(): bool
    {
        return $this->ended !== null;
    }

    /** Milliseconds of this reel the meter can still pay for. */
    public function msUntilEmpty(): int
    {
        return self::ceilDiv($this->meter * 1000, $this->reel->drain);
    }

    /** The first hold duration on this reel that can only be late. */
    public function holdFailAfter(): int
    {
        $reel = $this->reel;

        return self::ceilDiv(($reel->zoneCenter + $reel->zoneHalf + 1) * $reel->holdFill, 1000);
    }

    /**
     * Judges one `[gesture, t, d]` action. Takes it untyped, as it arrives in
     * JSON, and refuses exactly what the TypeScript engine refuses.
     *
     * @throws EngineError
     */
    public function apply(mixed $action): Step
    {
        $reel = $this->reel;
        if ($this->ended !== null) {
            throw new EngineError(EngineError::RUN_OVER, $reel->index);
        }

        if (! is_array($action) || ! array_is_list($action) || count($action) !== 3) {
            throw new EngineError(EngineError::MALFORMED_ACTION, $reel->index);
        }

        $code = self::whole($action[0]);
        $gesture = $code === null ? null : Gesture::tryFrom($code);
        $t = self::whole($action[1]);
        $d = self::whole($action[2]);
        if (
            $gesture === null
            || $t === null || $t < 0 || $t > self::MAX_MS
            || $d === null || $d < 0 || $d > self::MAX_MS
            || ($gesture !== Gesture::Hold && $d !== 0)
            || ($gesture === Gesture::None && $t !== 0)
        ) {
            throw new EngineError(EngineError::MALFORMED_ACTION, $reel->index);
        }
        if (! $gesture->allowedOn($reel->kind)) {
            throw new EngineError(EngineError::GESTURE_NOT_ALLOWED, $reel->index);
        }
        if ($gesture !== Gesture::None && $t >= $reel->window) {
            throw new EngineError(EngineError::LATE_ACTION, $reel->index);
        }

        $active = match ($gesture) {
            Gesture::None => $reel->window,
            Gesture::Hold => $t + $d,
            default => $t,
        };

        $untilEmpty = $this->msUntilEmpty();
        if ($active >= $untilEmpty) {
            $this->activeMs += $untilEmpty;
            $this->meter = 0;
            $this->ended = EndReason::Drained;

            return $this->step($reel, Verdict::Drained, 0, 0, [], $gesture, $t, $d);
        }

        $this->activeMs += $active;
        $this->meter -= intdiv($reel->drain * $active, 1000);

        $verdict = self::judge($reel, $gesture, $d);

        return $verdict->isHit()
            ? $this->hit($reel, $verdict, $gesture, $t, $d)
            : $this->miss($reel, $verdict, $gesture, $t, $d);
    }

    /** The player left: whatever was on screen is not judged. */
    public function quit(): void
    {
        $this->ended ??= EndReason::Quit;
    }

    public function summary(): RunSummary
    {
        return new RunSummary(
            engineVersion: Rules::ENGINE_VERSION,
            seed: $this->seed,
            score: $this->score,
            reels: $this->reels,
            hits: $this->hits,
            misses: $this->misses,
            perfects: $this->perfects,
            maxStreak: $this->maxStreak,
            level: $this->reels === 0 ? 1 : 1 + intdiv($this->reels - 1, Rules::LEVEL_EVERY),
            accuracy: $this->reels === 0 ? 0 : intdiv($this->hits * 1000, $this->reels),
            avgReactionMs: $this->reactionCount === 0 ? 0 : intdiv($this->reactionSum, $this->reactionCount),
            activeMs: $this->activeMs,
            endedBy: $this->ended ?? EndReason::Quit,
            maxCombo: $this->maxCombo,
            bonusPoints: $this->bonusPoints,
            bonuses: $this->bonusCounts,
        );
    }

    /** How close to the zone's centre a hold of `$d` ms let go, per-mille. */
    public static function precisionOf(Reel $reel, int $d): int
    {
        $fill = intdiv($d * 1000, $reel->holdFill);
        $off = abs($fill - $reel->zoneCenter);

        return max(0, 1000 - intdiv($off * 1000, $reel->zoneHalf));
    }

    private function hit(Reel $reel, Verdict $verdict, Gesture $gesture, int $t, int $d): Step
    {
        $this->streak++;
        $this->maxStreak = max($this->maxStreak, $this->streak);
        $this->hits++;
        if ($verdict === Verdict::Perfect) {
            $this->perfects++;
        }

        $this->combo = Rules::comboAfterHit($this->combo);
        $this->maxCombo = max($this->maxCombo, $this->combo);
        $base = Rules::BASE[$reel->kind->value];
        $bonus = 0;
        if ($gesture === Gesture::Up || $gesture === Gesture::Like) {
            $floor = Rules::SPEED_FLOOR;
            $clamped = min(max($t, $floor), $reel->window);
            $bonus = intdiv($base * ($reel->window - $clamped), $reel->window - $floor);
            $this->reactionSum += $t;
            $this->reactionCount++;
        } elseif ($gesture === Gesture::Hold) {
            $bonus = intdiv(Rules::PRECISION_BONUS * self::precisionOf($reel, $d), 1000);
        }

        $points = intdiv(($base + $bonus) * Rules::levelBoostFor($reel->index) * $this->combo, 1000000);
        $this->score += $points;
        $this->meter = min(
            Rules::METER_MAX,
            $this->meter + Rules::GAIN[$reel->kind->value] + ($verdict === Verdict::Perfect ? Rules::PERFECT_GAIN : 0),
        );
        $bonuses = $this->namedCombos($reel, $t);
        $this->previousHit = $reel->kind;
        if ($this->meter < Rules::COMEBACK_LOW) {
            $this->lowMeter = true;
        }

        return $this->advance($reel, $verdict, $points, $this->combo, $bonuses, $gesture, $t, $d);
    }

    /**
     * The named combos this hit sets off, in the order they are checked.
     *
     * @return list<BonusHit>
     */
    private function namedCombos(Reel $reel, int $t): array
    {
        $bonuses = [];
        $award = function (BonusKind $kind) use ($reel, &$bonuses): void {
            $points = Rules::bonusFor($kind, $reel->index);
            $this->bonusCounts[$kind->value]++;
            $this->bonusPoints += $points;
            $this->score += $points;
            $bonuses[] = new BonusHit($kind, $points);
        };

        if ($this->levelClean && $reel->index % Rules::LEVEL_EVERY === Rules::LEVEL_EVERY - 1) {
            $award(BonusKind::Flawless);
        }
        if ($reel->kind === ReelKind::Skip || $reel->kind === ReelKind::Like) {
            if ($t <= Rules::LIGHTNING_MS[$reel->kind->value]) {
                $this->lightningRun++;
                if ($this->lightningRun === Rules::LIGHTNING_RUN) {
                    $award(BonusKind::Lightning);
                    $this->lightningRun = 0;
                }
            } else {
                $this->lightningRun = 0;
            }
        }
        if ($reel->kind === ReelKind::Freeze && ($this->previousHit === ReelKind::Like || $this->previousHit === ReelKind::Hold)) {
            $award(BonusKind::CoolHead);
        }
        if ($this->lowMeter && $this->meter >= Rules::COMEBACK_HIGH) {
            $award(BonusKind::Comeback);
            $this->lowMeter = false;
        }

        return $bonuses;
    }

    private function miss(Reel $reel, Verdict $verdict, Gesture $gesture, int $t, int $d): Step
    {
        $this->streak = 0;
        $this->misses++;
        $this->combo = Rules::comboAfterMiss($this->combo);
        $this->levelClean = false;
        $this->lightningRun = 0;
        $this->previousHit = null;
        $this->meter -= match ($verdict) {
            Verdict::Timeout => Rules::LOSS_TIMEOUT,
            Verdict::Caught => Rules::LOSS_CAUGHT,
            Verdict::HoldEarly, Verdict::HoldLate => Rules::LOSS_HOLD_MISS,
            default => Rules::LOSS_WRONG,
        };
        if ($this->meter <= 0) {
            $this->meter = 0;
            $this->ended = EndReason::Penalty;
        }
        if ($this->meter < Rules::COMEBACK_LOW) {
            $this->lowMeter = true;
        }

        return $this->advance($reel, $verdict, 0, 0, [], $gesture, $t, $d);
    }

    /**
     * @param  list<BonusHit>  $bonuses
     */
    private function advance(Reel $reel, Verdict $verdict, int $points, int $combo, array $bonuses, Gesture $gesture, int $t, int $d): Step
    {
        $this->reels++;
        if ($this->ended === null) {
            $this->reel = $this->stream->next();
            if ($this->reel->index % Rules::LEVEL_EVERY === 0) {
                $this->levelClean = true;
            }
        }

        return $this->step($reel, $verdict, $points, $combo, $bonuses, $gesture, $t, $d);
    }

    /**
     * @param  list<BonusHit>  $bonuses
     */
    private function step(Reel $reel, Verdict $verdict, int $points, int $combo, array $bonuses, Gesture $gesture, int $t, int $d): Step
    {
        return new Step(
            reel: $reel,
            verdict: $verdict,
            points: $points,
            combo: $combo,
            bonuses: $bonuses,
            meter: $this->meter,
            over: $this->ended !== null,
            gesture: $gesture,
            t: $t,
            d: $d,
        );
    }

    private static function judge(Reel $reel, Gesture $gesture, int $d): Verdict
    {
        if ($reel->kind === ReelKind::Freeze) {
            return $gesture === Gesture::None ? Verdict::Hit : Verdict::Caught;
        }
        if ($gesture === Gesture::None) {
            return Verdict::Timeout;
        }
        if ($reel->kind === ReelKind::Skip) {
            return $gesture === Gesture::Up ? Verdict::Hit : Verdict::Wrong;
        }
        if ($reel->kind === ReelKind::Like) {
            return $gesture === Gesture::Like ? Verdict::Hit : Verdict::Wrong;
        }
        if ($gesture !== Gesture::Hold) {
            return Verdict::Wrong;
        }

        $off = intdiv($d * 1000, $reel->holdFill) - $reel->zoneCenter;
        if ($off < -$reel->zoneHalf) {
            return Verdict::HoldEarly;
        }
        if ($off > $reel->zoneHalf) {
            return Verdict::HoldLate;
        }

        return self::precisionOf($reel, $d) >= Rules::PERFECT_PRECISION ? Verdict::Perfect : Verdict::Hit;
    }

    /**
     * A JSON number with no fractional part, as JavaScript's `Number.isInteger`
     * sees it: `400` and `400.0` are whole, `400.5`, `"400"`, `true` and
     * `null` are not.
     */
    private static function whole(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) <= 2 ** 53) {
            return (int) $value;
        }

        return null;
    }

    /** `Math.ceil($a / $b)` for a non-negative `$a` and a positive `$b`. */
    private static function ceilDiv(int $a, int $b): int
    {
        return intdiv($a + $b - 1, $b);
    }
}
