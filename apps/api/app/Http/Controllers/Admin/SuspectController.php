<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SuspectsRequest;
use App\Services\Admin\Suspects;
use Illuminate\Http\JsonResponse;

/** `GET /admin/suspects` — the players the anti-cheat is most worried about, riskiest first. */
class SuspectController extends Controller
{
    public function __invoke(SuspectsRequest $request, Suspects $suspects): JsonResponse
    {
        return response()->json($suspects->list($request->days(), $request->includeBanned(), $request->page(), $request->perPage()));
    }
}
