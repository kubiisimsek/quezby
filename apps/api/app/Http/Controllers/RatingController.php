<?php

namespace App\Http\Controllers;

use App\Http\Requests\RatingBoardRequest;
use App\Models\User;
use App\Services\Rating\RatingService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class RatingController extends Controller
{
    /** The player's Elo, league and the target of their next run. */
    public function show(#[CurrentUser] User $user, RatingService $ratings): JsonResponse
    {
        return response()->json($ratings->current($user));
    }

    /** The highest ratings of the players who played lately — everyone's, or among friends. */
    public function board(RatingBoardRequest $request, #[CurrentUser] User $user, RatingService $ratings): JsonResponse
    {
        return response()->json($ratings->board($user, $request->scope()));
    }
}
