<?php

namespace App\Http\Controllers;

use App\Enums\LeaderboardPeriod;
use App\Http\Requests\LeaderboardRequest;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class LeaderboardController extends Controller
{
    public function __invoke(
        LeaderboardRequest $request,
        LeaderboardPeriod $board,
        #[CurrentUser] User $user,
        LeaderboardService $leaderboards,
    ): JsonResponse {
        return response()->json($leaderboards->board($board, $request->scope(), $request->limit(), $user));
    }
}
