<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\RunHistoryRequest;
use App\Http\Resources\RunResultResource;
use App\Models\User;
use App\Services\RunHistory;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class RunHistoryController extends Controller
{
    public function __construct(
        private readonly RunHistory $history,
    ) {}

    /** `RunHistoryResponse`: the player's past games, the newest first. */
    public function index(RunHistoryRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json($this->history->page($user, $request->mode(), $request->cursor()));
    }

    /** `RunDetailResponse`: one past game, as the replay found it. Someone else's is not found. */
    public function show(string $runId, #[CurrentUser] User $user): JsonResponse
    {
        $run = $this->history->find($user, $runId) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json([
            'summary' => $this->history->summaries($user, collect([$run]))[0],
            'run' => new RunResultResource($run),
        ]);
    }
}
