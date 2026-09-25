<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckpointRequest;
use App\Http\Requests\FinishRunRequest;
use App\Http\Requests\StartRunRequest;
use App\Http\Resources\MeResource;
use App\Http\Resources\RunResultResource;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\RunService;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class RunController extends Controller
{
    public function __construct(
        private readonly RunService $runs,
    ) {}

    public function store(StartRunRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $run = $this->runs->start(
            $user,
            $request->mode(),
            $request->engineVersion(),
            $request->contentVersion(),
            $request->appVersion(),
        );

        return response()->json([
            'runId' => $run->id,
            'seed' => $run->seed,
            'engineVersion' => $run->engine_version,
            'contentVersion' => $run->content_version,
            'mode' => $run->mode->value,
            'dayKey' => $run->daily_key,
            'startedAt' => Timestamp::iso($run->started_at),
        ], 201);
    }

    /** `CheckpointResponse`: how far the run has got, signed with the time the API saw it. */
    public function checkpoint(CheckpointRequest $request, string $runId, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json([
            'receipt' => $this->runs->checkpoint($user, $runId, $request->reel(), $request->prefixHash()),
        ]);
    }

    public function finish(
        FinishRunRequest $request,
        string $runId,
        #[CurrentUser] User $user,
        LeaderboardService $leaderboards,
    ): JsonResponse {
        $finished = $this->runs->finish(
            $user,
            $runId,
            $request->actions(),
            (int) $request->validated('clientScore'),
            (int) $request->validated('clientReels'),
            $request->checkpoints(),
        );

        $outcome = $finished->outcome;
        $ranks = $outcome?->after ?? $leaderboards->ranksFor($user);

        return response()->json([
            'run' => new RunResultResource($finished->run),
            'best' => MeResource::best($user),
            'isNewBest' => $outcome?->isNewBest ?? false,
            'ranks' => $ranks,
            'rankChanges' => $outcome?->changes() ?? array_map(fn (?int $rank) => ['before' => $rank, 'after' => $rank], $ranks),
            'passed' => $outcome?->passed ?? [],
            'daily' => $finished->daily,
            'league' => $finished->league,
            'shareText' => $finished->daily['shareText'] ?? $this->shareText($finished->run->score ?? 0, $finished->run->reels ?? 0, $ranks['daily']),
        ]);
    }

    /** What "Paylaş" sends after a free run, from the server's own numbers. */
    private function shareText(int $score, int $reels, ?int $dailyRank): string
    {
        $rank = $dailyRank === null ? '' : ' · bugün #'.number_format($dailyRank, 0, ',', '.');

        return "Quezby'de ".number_format($score, 0, ',', '.')." puan yaptım! {$reels} post{$rank}. Sen kaç yaparsın?";
    }
}
