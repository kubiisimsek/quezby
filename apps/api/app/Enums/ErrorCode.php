<?php

namespace App\Enums;

/** Every `ApiErrorCode` of `packages/types`, with its status and its message in each language. */
enum ErrorCode: string
{
    case ValidationFailed = 'validation_failed';
    case Unauthenticated = 'unauthenticated';
    case NotFound = 'not_found';
    case UsernameInvalid = 'username_invalid';
    case UsernameTaken = 'username_taken';
    case UsernameLocked = 'username_locked';
    case InvalidCredentials = 'invalid_credentials';
    case EmailTaken = 'email_taken';
    case AlreadyLinked = 'already_linked';
    case IdentityInvalid = 'identity_invalid';
    case IdentityTaken = 'identity_taken';
    case LastSignInMethod = 'last_sign_in_method';
    case RunAlreadyFinished = 'run_already_finished';
    case RunExpired = 'run_expired';
    case RunRejected = 'run_rejected';
    case EngineOutdated = 'engine_outdated';
    case DailyAlreadyPlayed = 'daily_already_played';
    case CannotFollowSelf = 'cannot_follow_self';
    case FollowLimit = 'follow_limit';
    case ChallengeInvalid = 'challenge_invalid';
    case IntegrityInvalid = 'integrity_invalid';
    case AttestKeyUnknown = 'attest_key_unknown';
    case TooManyRequests = 'too_many_requests';
    case Forbidden = 'forbidden';
    case ServerError = 'server_error';

    public function status(): int
    {
        return match ($this) {
            self::Unauthenticated => 401,
            self::Forbidden => 403,
            self::NotFound => 404,
            self::UsernameTaken, self::UsernameLocked, self::EmailTaken, self::AlreadyLinked, self::IdentityTaken, self::LastSignInMethod,
            self::RunAlreadyFinished, self::DailyAlreadyPlayed, self::AttestKeyUnknown => 409,
            self::RunExpired => 410,
            self::ValidationFailed, self::UsernameInvalid, self::InvalidCredentials, self::IdentityInvalid,
            self::RunRejected, self::EngineOutdated, self::CannotFollowSelf, self::FollowLimit,
            self::ChallengeInvalid, self::IntegrityInvalid => 422,
            self::TooManyRequests => 429,
            self::ServerError => 500,
        };
    }

    /**
     * What the player reads, in the request's language (`lang/{locale}/errors.php`).
     * `follow_limit` names the cap: `$replace['limit']`, else the configured one.
     *
     * @param  array<string, int|string>  $replace
     */
    public function message(array $replace = []): string
    {
        if ($this === self::FollowLimit) {
            $replace += ['limit' => Locale::current()->group((int) config('quezby.follows.limit'))];
        }

        return __('errors.'.$this->value, $replace);
    }
}
