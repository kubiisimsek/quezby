<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LeaguesRequest;
use App\Models\LeagueGroup;
use App\Services\Admin\AdminLeagues;
use Illuminate\Http\JsonResponse;

/** `GET /admin/leagues` and `/admin/leagues/groups/{group}` — a week's groups, and one group's table. */
class LeagueController extends Controller
{
    public function __construct(
        private readonly AdminLeagues $leagues,
    ) {}

    public function index(LeaguesRequest $request): JsonResponse
    {
        return response()->json($this->leagues->week($request->validated('week'), $request->tier(), $request->page(), $request->perPage()));
    }

    public function show(int $group): JsonResponse
    {
        $found = LeagueGroup::query()->find($group) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json($this->leagues->group($found));
    }
}
