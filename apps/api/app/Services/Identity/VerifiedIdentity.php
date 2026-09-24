<?php

namespace App\Services\Identity;

use App\Enums\SocialProvider;

/** An Apple or Google account whose identity token checked out. */
final readonly class VerifiedIdentity
{
    public function __construct(
        public SocialProvider $provider,
        /** The provider's stable id for the person. */
        public string $subject,
        /** Kept for support only; never used to find or merge accounts. */
        public ?string $email,
        public bool $emailVerified,
        /** The app the token was issued to — its `aud`. */
        public string $clientId,
    ) {}
}
