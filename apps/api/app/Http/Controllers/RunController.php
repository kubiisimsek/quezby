<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Enums\RunMode;
use App\Exceptions\ApiException;
use App\Http\Requests\CheckpointRequest;
use App\Http\Requests\FinishRunRequest;
use App\Http\Requests\StartRunRequest;
use App\Http\Resources\MeResource;
use App\Http\Resources\RunResultResource;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\PlayerDirectory;
use App\Services\RunService;
use App\Services\Social\DuelService;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class RunController extends Controller
{
    public function __construct(
        private readonly RunService $runs,
    ) {}

    public function store(StartRunRequest $request, #[CurrentUser] User $user, PlayerDirectory $players): JsonResponse
    {
        $opponent = $request->opponent();
        $run = $this->runs->start(
            $user,
            $request->mode(),
            $request->engineVersion(),
            $request->contentVersion(),
            $request->appVersion(),
            $opponent === null ? null : ($players->find($opponent, $user) ?? throw ApiException::of(ErrorCode::NotFound)),
            $request->duel(),
            $request->difficultyVersion(),
        );

        return response()->json([
            'runId' => $run->id,
            'seed' => $run->seed,
            'engineVersion' => $run->engine_version,
            'contentVersion' => $run->content_version,
            'difficulty' => $run->difficulty,
            'mode' => $run->mode->value,
            'dayKey' => $run->daily_key,
            'duelId' => $run->duel_id,
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

    /** A run given up in its countdown. */
    public function cancel(string $runId, #[CurrentUser] User $user): Response
    {
        $this->runs->cancel($user, $runId);

        return response()->noContent();
    }

    public function finish(
        FinishRunRequest $request,
        string $runId,
        #[CurrentUser] User $user,
        LeaderboardService $leaderboards,
        DuelService $duels,
        PlayerDirectory $players,
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
        $duel = $finished->duel;

        return response()->json([
            'run' => new RunResultResource($finished->run),
            'best' => MeResource::best($user),
            'isNewBest' => $outcome?->isNewBest ?? false,
            'ranks' => $ranks,
            'rankChanges' => $outcome?->changes() ?? array_map(fn (?int $rank) => ['before' => $rank, 'after' => $rank], $ranks),
            'passed' => $outcome?->passed ?? [],
            'daily' => $finished->daily,
            'rating' => $finished->rating,
            'leagueUnlock' => $finished->leagueUnlock,
            // A VS is between two friends: nothing of it is for sharing. A rated
            // run never climbs the week, so it shares no week rank.
            'shareText' => $finished->run->mode === RunMode::Vs
                ? null
                : $finished->daily['shareText'] ?? $this->shareText(
                    $finished->run->score ?? 0,
                    $finished->run->reels ?? 0,
                    $finished->run->mode->boards() ? $ranks['weekly'] : null,
                ),
            'duel' => $duel === null ? null : $duels->view($user, $duel, $players->summary($user, User::query()->findOrFail($duel->otherOf($user)))),
        ]);
    }

    /**
     * What "Paylaş" sends after a free run, from the server's own numbers, in
     * the request's language (`lang/{locale}/share.php`) — with this week's
     * rank once the run has one.
     */
    private function shareText(int $score, int $reels, ?int $weekRank): string
    {
        $locale = Locale::current();
        $replace = [
            'points' => trans_choice('share.points', $score, ['count' => $locale->group($score)]),
            'posts' => trans_choice('share.posts', $reels, ['count' => $locale->group($reels)]),
        ];

        return $weekRank === null
            ? __('share.free', $replace)
            : __('share.free_ranked', $replace + ['rank' => $locale->group($weekRank)]);
    }
}
