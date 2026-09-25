<?php

namespace App\Enums;

/**
 * Every signal the API puts on a run — `RunFlagCode` in `packages/types`,
 * `docs/product/scoring.md` → "Hile koruması". A hard one keeps a run off
 * every board; a soft one only holds a top score for review.
 *
 * `weight()` is what a signal adds to a player's risk on the admin panel's
 * suspects list (`docs/backend/admin-api.md`): the surer the signal, the
 * heavier. `banned` weighs nothing — the player is dealt with already.
 */
enum RunFlag: string
{
    case WallClock = 'wall_clock';
    case FastDecisions = 'fast_decisions';
    case HoldBounds = 'hold_bounds';
    case ClientMismatch = 'client_mismatch';
    case Banned = 'banned';
    case CheckpointForged = 'checkpoint_forged';
    case CheckpointMismatch = 'checkpoint_mismatch';
    case SlowMotion = 'slow_motion';
    case DeviceIntegrity = 'device_integrity';
    case EngineError = 'engine_error';
    case Moderator = 'moderator';
    case ReactionCv = 'reaction_cv';
    case FloorHugging = 'floor_hugging';
    case PerfectShare = 'perfect_share';
    case SlowTiming = 'slow_timing';
    case CheckpointMissing = 'checkpoint_missing';
    case DeviceUnverified = 'device_unverified';
    case ScoreJump = 'score_jump';
    case DailySharedInstall = 'daily_shared_install';

    public function isHard(): bool
    {
        return match ($this) {
            self::ReactionCv, self::FloorHugging, self::PerfectShare, self::SlowTiming,
            self::CheckpointMissing, self::DeviceUnverified, self::ScoreJump, self::DailySharedInstall => false,
            default => true,
        };
    }

    /** `hard` or `soft`, as the flag itself says. */
    public function severity(): string
    {
        return $this->isHard() ? 'hard' : 'soft';
    }

    public function weight(): int
    {
        return match ($this) {
            self::CheckpointForged => 10,
            self::CheckpointMismatch, self::Moderator => 8,
            self::ClientMismatch, self::FastDecisions, self::WallClock, self::SlowMotion => 6,
            self::HoldBounds, self::DeviceIntegrity => 5,
            self::EngineError, self::DailySharedInstall => 3,
            self::ScoreJump, self::ReactionCv, self::FloorHugging, self::PerfectShare => 2,
            self::SlowTiming, self::CheckpointMissing => 1,
            self::Banned, self::DeviceUnverified => 0,
        };
    }

    /**
     * `,wall_clock,reaction_cv,` — the codes of a run's flags, each once, for
     * `runs.flag_codes`; null for none. Takes the flags as the model holds
     * them or as JSON.
     */
    public static function codesOf(mixed $flags): ?string
    {
        if (is_string($flags)) {
            $flags = json_decode($flags, true);
        }
        if (! is_array($flags)) {
            return null;
        }

        $codes = [];
        foreach ($flags as $flag) {
            $code = is_array($flag) ? ($flag['code'] ?? null) : null;
            if (is_string($code) && $code !== '') {
                $codes[$code] = true;
            }
        }

        return $codes === [] ? null : ','.implode(',', array_keys($codes)).',';
    }

    /** The LIKE pattern for runs that carry this flag; `_` is escaped with `!`. */
    public function pattern(): string
    {
        return '%,'.str_replace('_', '!_', $this->value).',%';
    }
}
