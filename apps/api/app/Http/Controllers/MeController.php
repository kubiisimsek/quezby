<?php

namespace App\Http\Controllers;

use App\Enums\SocialProvider;
use App\Http\Resources\MeResource;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\Identity\AppleTokenRevoker;
use App\Services\LeaderboardService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class MeController extends Controller
{
    public function show(#[CurrentUser] User $user, LeaderboardService $leaderboards): JsonResponse
    {
        return response()->json([
            'user' => new MeResource($user),
            'ranks' => $leaderboards->ranksFor($user),
        ]);
    }

    /**
     * The account, its runs, its leaderboard rows and every token (App Store
     * 5.1.1(v)). Apple's grant is revoked first; that never stops the deletion.
     */
    public function destroy(#[CurrentUser] User $user, AppleTokenRevoker $apple): Response
    {
        $user->identities()->where('provider', SocialProvider::Apple)->get()
            ->each(fn (SocialIdentity $identity) => $apple->revoke($identity));

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->leaderboardEntries()->delete();
            $user->runs()->delete();
            $user->delete();
        });

        return response()->noContent();
    }
}
