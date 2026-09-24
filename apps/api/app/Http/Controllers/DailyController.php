<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DailyService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class DailyController extends Controller
{
    /** Today's "Günün akışı": the player's one attempt and the top of the board. */
    public function __invoke(#[CurrentUser] User $user, DailyService $daily): JsonResponse
    {
        return response()->json($daily->state($user));
    }
}
