<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReasonRequest;
use App\Models\Admin;
use App\Models\Run;
use App\Services\ModerationService;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `POST /admin/runs/{run}/approve` and `/reject` — the review queue's two
 * answers. `{ changed: false }` when the run was not in a state to take it.
 */
class RunActionController extends Controller
{
    public function __construct(
        private readonly ModerationService $moderation,
    ) {}

    public function approve(Request $request, string $run, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['changed' => $this->moderation->approve($this->run($run), Actor::panel($admin, $request))]);
    }

    public function reject(ReasonRequest $request, string $run, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['changed' => $this->moderation->reject($this->run($run), $request->reason(), Actor::panel($admin, $request))]);
    }

    private function run(string $id): Run
    {
        return Run::query()->with('user')->find(strtolower($id)) ?? throw ApiException::of(ErrorCode::NotFound);
    }
}
