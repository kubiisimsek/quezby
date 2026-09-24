<?php

namespace App\Enums;

/** Every `ApiErrorCode` of `packages/types`, with its status and Turkish message. */
enum ErrorCode: string
{
    case ValidationFailed = 'validation_failed';
    case Unauthenticated = 'unauthenticated';
    case NotFound = 'not_found';
    case UsernameInvalid = 'username_invalid';
    case UsernameTaken = 'username_taken';
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
    case ServerError = 'server_error';

    public function status(): int
    {
        return match ($this) {
            self::Unauthenticated => 401,
            self::NotFound => 404,
            self::UsernameTaken, self::EmailTaken, self::AlreadyLinked, self::IdentityTaken, self::LastSignInMethod,
            self::RunAlreadyFinished, self::DailyAlreadyPlayed, self::AttestKeyUnknown => 409,
            self::RunExpired => 410,
            self::ValidationFailed, self::UsernameInvalid, self::InvalidCredentials, self::IdentityInvalid,
            self::RunRejected, self::EngineOutdated, self::CannotFollowSelf, self::FollowLimit,
            self::ChallengeInvalid, self::IntegrityInvalid => 422,
            self::TooManyRequests => 429,
            self::ServerError => 500,
        };
    }

    public function message(): string
    {
        return match ($this) {
            self::ValidationFailed => 'Gönderilen bilgilerde bir sorun var.',
            self::Unauthenticated => 'Oturumun geçersiz, lütfen yeniden giriş yap.',
            self::NotFound => 'Aradığın şey bulunamadı.',
            self::UsernameInvalid => 'Bu kullanıcı adı geçersiz.',
            self::UsernameTaken => 'Bu kullanıcı adı alınmış.',
            self::InvalidCredentials => 'E-posta ya da şifre hatalı.',
            self::EmailTaken => 'Bu e-posta başka bir hesaba bağlı.',
            self::AlreadyLinked => 'Bu hesaba zaten bağlı.',
            self::IdentityInvalid => 'Giriş doğrulanamadı, lütfen tekrar dene.',
            self::IdentityTaken => 'Bu hesap başka bir Quezby oyuncusuna bağlı.',
            self::LastSignInMethod => 'Bu, hesabına girmenin tek yolu. Önce başka bir yol bağla.',
            self::RunAlreadyFinished => 'Bu oyun zaten bitirilmiş.',
            self::RunExpired => 'Bu oyunun süresi doldu.',
            self::RunRejected => 'Bu oyun doğrulanamadı, sıralamaya giremez.',
            self::EngineOutdated => 'Oyun sürümün güncel değil, sıralamaya girmek için uygulamayı güncelle.',
            self::DailyAlreadyPlayed => 'Günün akışını bugün oynadın. Yarın yeni akış seni bekliyor.',
            self::CannotFollowSelf => 'Kendini takip edemezsin.',
            self::FollowLimit => 'En fazla 500 oyuncu takip edebilirsin.',
            self::ChallengeInvalid => 'Cihaz doğrulama isteği geçersiz ya da süresi dolmuş, tekrar dene.',
            self::IntegrityInvalid => 'Cihaz doğrulaması okunamadı, tekrar dene.',
            self::AttestKeyUnknown => 'Bu cihazın anahtarı tanınmıyor, cihazı yeniden doğrula.',
            self::TooManyRequests => 'Çok fazla istek gönderdin, biraz bekleyip tekrar dene.',
            self::ServerError => 'Bir şeyler ters gitti, birazdan tekrar dene.',
        };
    }
}
