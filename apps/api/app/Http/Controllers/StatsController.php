<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PlayerStatsService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /** The player's lifetime numbers, from the server's replays of their ranked runs. */
    public function __invoke(#[CurrentUser] User $user, PlayerStatsService $stats): JsonResponse
    {
        return response()->json($stats->of($user));
    }
}
