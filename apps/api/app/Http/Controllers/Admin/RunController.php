<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminRole;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RunsRequest;
use App\Models\Admin;
use App\Models\Run;
use App\Services\Admin\AdminRuns;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * `GET /admin/runs` and `/admin/runs/{run}` — every run in every status, with
 * its signals, and a finished run's replay post by post.
 */
class RunController extends Controller
{
    public function __construct(
        private readonly AdminRuns $runs,
    ) {}

    public function index(RunsRequest $request): JsonResponse
    {
        return response()->json($this->runs->list(
            $request->safe()->only(['status', 'mode', 'flag', 'player', 'from', 'to', 'sort']),
            $request->page(),
            $request->perPage(),
        ));
    }

    public function show(string $run, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $found = Run::query()->with('user')->find(strtolower($run)) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json($this->runs->detail($found, $admin->hasRole(AdminRole::Owner)));
    }
}
