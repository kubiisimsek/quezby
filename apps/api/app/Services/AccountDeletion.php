<?php

namespace App\Services;

use App\Enums\SocialProvider;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use App\Services\Identity\AppleTokenRevoker;
use Illuminate\Support\Facades\DB;

/**
 * Deletes a player's account: the account, its runs, its leaderboard rows,
 * its profile photo and every token (App Store 5.1.1(v)) — friends, requests,
 * blocks, conversations, VS and reports go with the account row — whether the player asked in the app
 * or an owner did it from the admin panel. Apple's grant is revoked first;
 * that never stops the deletion.
 */
final class AccountDeletion
{
    public function __construct(
        private readonly AppleTokenRevoker $apple,
        private readonly AvatarService $avatars,
    ) {}

    public function delete(User $user): void
    {
        $user->identities()->where('provider', SocialProvider::Apple)->get()
            ->each(fn (SocialIdentity $identity) => $this->apple->revoke($identity));

        $avatar = $user->avatar;
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->leaderboardEntries()->delete();
            $user->runs()->delete();
            $user->delete();
        });
        $this->avatars->forget($avatar);
    }
}
