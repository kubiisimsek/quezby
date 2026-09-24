<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\LeagueService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class LeagueController extends Controller
{
    /** This week's league group, and how last week's ended. */
    public function __invoke(#[CurrentUser] User $user, LeagueService $leagues): JsonResponse
    {
        return response()->json($leagues->current($user));
    }
}
