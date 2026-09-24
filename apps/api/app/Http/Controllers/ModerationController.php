<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\Run;
use App\Models\User;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * `POST /ops/moderate` — the `quezby:*` moderation commands for hosts without
 * SSH, behind `X-Moderation-Token`.
 */
class ModerationController extends Controller
{
    public function __invoke(Request $request, ModerationService $moderation): JsonResponse
    {
        $input = $request->validate([
            'action' => ['required', Rule::in(['held', 'approve', 'reject', 'ban', 'unban'])],
            'runId' => ['required_if:action,approve,reject', 'string', 'max:26'],
            'username' => ['required_if:action,ban,unban', 'string', 'max:32'],
            'reason' => ['required_if:action,reject,ban', 'string', 'max:191'],
        ]);

        return match ($input['action']) {
            'held' => response()->json(['runs' => $moderation->held()->map(fn (Run $run) => [
                'runId' => $run->id,
                'username' => $run->user->username,
                'score' => $run->score,
                'reels' => $run->reels,
                'flags' => $run->flags ?? [],
                'finishedAt' => $run->finished_at?->toISOString(),
            ])->values()]),
            'approve' => response()->json(['done' => $moderation->approve($this->run($input['runId']))]),
            'reject' => response()->json(['done' => $moderation->reject($this->run($input['runId']), $input['reason'])]),
            'ban' => $this->done(fn () => $moderation->ban($this->user($input['username']), $input['reason'])),
            'unban' => $this->done(fn () => $moderation->unban($this->user($input['username']))),
        };
    }

    private function run(string $id): Run
    {
        return Run::query()->with('user')->find($id) ?? throw ApiException::of(ErrorCode::NotFound);
    }

    private function user(string $username): User
    {
        return User::query()->where('username', mb_strtolower(trim($username)))->first()
            ?? throw ApiException::of(ErrorCode::NotFound);
    }

    private function done(callable $action): JsonResponse
    {
        $action();

        return response()->json(['done' => true]);
    }
}
