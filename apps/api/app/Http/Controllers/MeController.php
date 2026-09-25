<?php

namespace App\Http\Controllers;

use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\AccountDeletion;
use App\Services\LeaderboardService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

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
     * 5.1.1(v)) — `AccountDeletion`.
     */
    public function destroy(#[CurrentUser] User $user, AccountDeletion $deletion): Response
    {
        $deletion->delete($user);

        return response()->noContent();
    }
}
