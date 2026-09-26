<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyticsVisitsRequest;
use App\Models\User;
use App\Services\Analytics\VisitIngest;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * `POST /analytics/visits` — the visits a consenting player's phone summed
 * up. `record: false` tells the app to keep nothing for a day.
 */
class AnalyticsController extends Controller
{
    public function __invoke(AnalyticsVisitsRequest $request, #[CurrentUser] User $user, VisitIngest $visits): JsonResponse
    {
        return response()->json(['record' => $visits->store($user, $request->batch())]);
    }
}
