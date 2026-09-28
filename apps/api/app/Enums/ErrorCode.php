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
    case CannotBefriendSelf = 'cannot_befriend_self';
    case FriendLimit = 'friend_limit';
    case RequestLimit = 'request_limit';
    case NotFriends = 'not_friends';
    case MessageLimit = 'message_limit';
    case DuelUnavailable = 'duel_unavailable';
    case DuelLimit = 'duel_limit';
    case PhotoInvalid = 'photo_invalid';
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
            self::RunAlreadyFinished, self::DailyAlreadyPlayed, self::AttestKeyUnknown, self::DuelUnavailable => 409,
            self::RunExpired => 410,
            self::ValidationFailed, self::UsernameInvalid, self::InvalidCredentials, self::IdentityInvalid,
            self::RunRejected, self::EngineOutdated, self::CannotBefriendSelf, self::FriendLimit, self::RequestLimit,
            self::NotFriends, self::MessageLimit, self::DuelLimit, self::PhotoInvalid,
            self::ChallengeInvalid, self::IntegrityInvalid => 422,
            self::TooManyRequests => 429,
            self::ServerError => 500,
        };
    }

    /**
     * What the player reads, in the request's language (`lang/{locale}/errors.php`).
     * A cap names itself: `$replace['limit']`, else the configured one.
     *
     * @param  array<string, int|string>  $replace
     */
    public function message(array $replace = []): string
    {
        $limit = match ($this) {
            self::FriendLimit => 'quezby.friends.limit',
            self::RequestLimit => 'quezby.friends.pending_limit',
            self::MessageLimit => 'quezby.inbox.phrases_per_day',
            self::DuelLimit => 'quezby.duels.waiting_limit',
            default => null,
        };
        if ($limit !== null) {
            $replace += ['limit' => Locale::current()->group((int) config($limit))];
        }

        return __('errors.'.$this->value, $replace);
    }
}
