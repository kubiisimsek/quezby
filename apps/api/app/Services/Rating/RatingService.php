<?php

namespace App\Services\Rating;

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Enums\RunFlag;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Difficulty;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use App\Services\Social\FriendService;
use App\Support\Timestamp;
use Closure;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Elo — played for in Dereceli (`RunMode::Rated`) alone, which opens once a
 * player has counted enough free and daily runs (`unlock`). Every rated run
 * is a match against the target of the player's rating (`TargetTable`); the
 * first few place them. The game gets harder as the rating climbs
 * (`difficultyFor`), and the targets of a rated run are the scores of its
 * difficulty.
 * Every write goes through `write()`: one transaction, the player's rating
 * row locked, and at most one change per run, so a run moves a rating once.
 *
 * What a run does (`docs/product/scoring.md` → "Elo"):
 * - ranked → counts; held for review → counts when approved, at that moment
 * - flagged for how it was played, left unfinished, thrown out by the
 *   engine → a forfeit, the full loss: leaving a run is never better than
 *   quitting it, which sends the score so far
 * - a banned player's, a failed device's, one from a past season, one given
 *   up in the countdown → nothing
 * - a free run, the day's, a VS → nothing, ever
 *
 * Beyond what runs do, and a reject takes back, a rating moves only by an
 * owner's hand from the panel (`adjust`), on the player's history and in the
 * audit log.
 */
final class RatingService
{
    /** Hard flags that say how a run was played — the ones that forfeit it. */
    private const SPARED_FLAGS = [RunFlag::Banned, RunFlag::DeviceIntegrity];

    /**
     * @param  array<string, mixed>  $config  `quezby.rating`
     */
    public function __construct(
        private readonly FriendService $friends,
        #[Config('quezby.rating')]
        private readonly array $config,
        #[Config('quezby.engine_version')]
        private readonly int $engineVersion,
        #[Config('quezby.rating.unlock_runs')]
        private readonly int $unlockRuns,
        #[Config('quezby.difficulty_version')]
        private readonly int $difficultyVersion,
    ) {}

    /**
     * The difficulty a rated run of `$user` is played at, from their rating
     * now: 0 while they are being placed.
     */
    public function difficultyFor(User $user): int
    {
        return $this->difficultyAt(PlayerRating::query()->whereKey($user->id)->value('rating')) ?? 0;
    }

    /**
     * The difficulty of a rating: 0 below `difficulty.from`, then one more
     * every `difficulty.step`, up to `Difficulty::MAX`. Null before placement.
     */
    public function difficultyAt(?int $rating): ?int
    {
        if ($rating === null) {
            return null;
        }
        $from = (int) $this->config['difficulty']['from'];

        return $rating < $from ? 0 : min(Difficulty::MAX, intdiv($rating - $from, (int) $this->config['difficulty']['step']) + 1);
    }

    /**
     * Whether a rated run scoring `$score` would lift its placed player into
     * the Elo board's first `$places` — what a soft-signalled rated run waits
     * for review for, as a score reaching the top of a board does.
     */
    public function wouldReachTop(User $user, Run $run, int $score, int $places): bool
    {
        $rating = PlayerRating::query()->find($user->id);
        $table = TargetTable::forRun($run);
        if ($rating === null || ! $rating->isPlaced() || $table === null) {
            return false;
        }
        $before = (int) $rating->rating;
        $width = (int) $this->config[$rating->provisional_left > 0 ? 'provisional_width' : 'width'];
        $delta = TargetTable::delta($before, $table->performance($score), $width, (int) $this->config['max_delta']);
        if ($delta <= 0) {
            return false;
        }

        $ahead = PlayerRating::query()
            ->join('users', 'users.id', '=', 'player_ratings.user_id')
            ->whereNull('users.banned_at')
            ->where('player_ratings.user_id', '!=', $user->id)
            ->whereNotNull('player_ratings.rating')
            ->where('player_ratings.rated_at', '>=', now()->subDays((int) $this->config['board_active_days']))
            ->where('player_ratings.rating', '>=', $before + $delta)
            ->count();

        return $ahead < $places;
    }

    /**
     * How far Dereceli still is — `LeagueUnlock` in `packages/types`: the
     * free and daily runs, ranked and scoring, still to count, and how many
     * rated runs place a player once it opens. Null once it is open; it stays
     * open to anyone who has played a rated run.
     *
     * @return array{required: int, remaining: int, placement: int}|null
     */
    public function unlock(User $user): ?array
    {
        if (PlayerRating::query()->whereKey($user->id)->exists()) {
            return null;
        }
        $remaining = max(0, $this->unlockRuns - $this->opening($user)->count());

        return $remaining === 0 ? null : $this->unlocking($remaining);
    }

    /**
     * What a finished free or daily run did to the way into Dereceli: how
     * far it still is, `remaining: 0` on the very run that opened it, and
     * null for any other run — or once it has long been open.
     *
     * @return array{required: int, remaining: int, placement: int}|null
     */
    public function unlockAfter(Run $run): ?array
    {
        if (! $run->mode->opensRated()) {
            return null;
        }
        $unlock = $this->unlock($run->user);
        if ($unlock !== null) {
            return $unlock;
        }
        $counted = $run->status === RunStatus::Ranked && (int) $run->score > 0;
        $openedNow = $counted
            && ! PlayerRating::query()->whereKey($run->user_id)->exists()
            && $this->opening($run->user)->count() === $this->unlockRuns;

        return $openedNow ? $this->unlocking(0) : null;
    }

    /** @return array{required: int, remaining: int, placement: int} */
    private function unlocking(int $remaining): array
    {
        return [
            'required' => $this->unlockRuns,
            'remaining' => $remaining,
            'placement' => (int) $this->config['placement_runs'],
        ];
    }

    /**
     * The runs that open Dereceli: free and daily, ranked, scoring.
     *
     * @return HasMany<Run, User>
     */
    private function opening(User $user): HasMany
    {
        return $user->runs()
            ->whereIn('mode', [RunMode::Free->value, RunMode::Daily->value])
            ->where('status', RunStatus::Ranked->value)
            ->where('score', '>', 0);
    }

    /**
     * What a run just finished did to its player's rating — `RunRating` in
     * `packages/types` — with the difficulty it was played at and the one the
     * next rated run gets. Null for any run but a rated one. Called inside
     * the finish's transaction.
     *
     * @return array<string, mixed>|null
     */
    public function forFinishedRun(Run $run): ?array
    {
        if (! $run->mode->rated()) {
            return null;
        }
        $view = $run->status === RunStatus::Review
            ? $this->write($run->user, fn (PlayerRating $rating) => $this->pending($rating))
            : $this->write($run->user, fn (PlayerRating $rating) => $this->settle($rating, $run, $this->kindOf($run)));

        return $view + [
            'difficulty' => (int) $run->difficulty,
            'nextDifficulty' => $this->difficultyAt($view['after']),
        ];
    }

    /**
     * Charges a run that was never finished — left for a new one, past its
     * time, or thrown out by the engine — as a forfeit. A run of a past
     * season, a banned player's, or one given up in the countdown
     * (`$spared`) is only noted.
     */
    public function forfeit(Run $run, bool $spared = false): void
    {
        if (! $run->mode->rated()) {
            return;
        }
        $spared = $spared || $run->user->isBanned() || $run->engine_version !== $this->engineVersion;

        $this->write($run->user, fn (PlayerRating $rating) => $this->settle(
            $rating, $run, $spared ? RatingKind::Void : RatingKind::Forfeit,
        ));
    }

    /** A held run a moderator let through counts now, from the rating the player has now. The change, or null. */
    public function approved(Run $run): ?int
    {
        if (! $run->mode->rated()) {
            return null;
        }
        $view = $this->write($run->user, fn (PlayerRating $rating) => $this->settle($rating, $run, $this->kindOf($run)));

        return $view['delta'] === 0 ? null : $view['delta'];
    }

    /**
     * A run a moderator threw out gives back what it won — never what it
     * lost: a cheat's loss stands. The change, or null when there was
     * nothing to take back.
     */
    public function rejected(Run $run): ?int
    {
        $change = RatingChange::query()->where('run_id', $run->id)->first();
        if ($change === null || $change->kind !== RatingKind::Run || $change->delta <= 0) {
            return null;
        }

        return $this->write($run->user, function (PlayerRating $rating) use ($change): ?int {
            if (! $rating->isPlaced() || RatingChange::query()->where('reversal_of', $change->id)->exists()) {
                return null;
            }
            $before = (int) $rating->rating;
            $after = max(0, $before - $change->delta);
            $this->move($rating, $after, now());
            $rating->save();
            $this->record($rating, RatingKind::Reversal, $before, [
                'reversal_of' => $change->id,
                'engine_version' => $change->engine_version,
            ]);

            return $after - $before;
        });
    }

    /**
     * Sets a player's rating by hand — an owner's call from the panel
     * (`PlayerActions::setRating`), which writes the audit entry. A player
     * not placed yet is placed with it: the rating row opens Dereceli, the
     * placement ends, and the provisional runs a placement gives start. No
     * run was played, so the runs counted and when the last one counted stay
     * as they are; the rating moved now, so of two equal ratings the other
     * one ranks first. A shield keeps the league a run promoted the player
     * into, so it goes when the rating leaves that league. Null when the
     * rating is `$rating` already — nothing written.
     *
     * @return array{from: int|null, to: int, tierFrom: string|null, tierTo: string}|null
     */
    public function adjust(User $player, int $rating): ?array
    {
        return $this->write($player, function (PlayerRating $row) use ($rating): ?array {
            $before = $row->rating;
            if ($before === $rating) {
                return null;
            }
            if (! $row->isPlaced()) {
                $row->provisional_left = (int) $this->config['provisional_runs'];
            }
            $this->move($row, $rating, now());
            if ($row->shield_tier !== null && $row->shield_tier !== $row->tier) {
                $row->shield_tier = null;
                $row->shield_left = 0;
            }
            $row->save();
            $this->record($row, RatingKind::Adjust, $before);

            return [
                'from' => $before,
                'to' => $rating,
                'tierFrom' => $before === null ? null : LeagueTier::fromRating($before)->slug(),
                'tierTo' => LeagueTier::fromRating($rating)->slug(),
            ];
        });
    }

    /**
     * `RatingResponse` in `packages/types`: how far Dereceli still is, the
     * placement, or the player's rating, league and the target of their next
     * run.
     *
     * @return array<string, mixed>
     */
    public function current(User $user): array
    {
        $rating = PlayerRating::query()->find($user->id);

        return $this->present($rating ?? new PlayerRating(['user_id' => $user->id]), $user);
    }

    /** A player's league: the tier of their rating, or null before placement. */
    public function tierOf(User $user): ?LeagueTier
    {
        $rating = PlayerRating::query()->whereKey($user->id)->value('rating');

        return $rating === null ? null : LeagueTier::fromRating((int) $rating);
    }

    /**
     * The placed players' ratings.
     *
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    public function ratingsOf(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return PlayerRating::query()
            ->whereIn('user_id', $ids)
            ->whereNotNull('rating')
            ->pluck('rating', 'user_id')
            ->map(fn ($rating) => (int) $rating)
            ->all();
    }

    /**
     * The placed players' leagues, as slugs.
     *
     * @param  list<string>  $ids
     * @return array<string, string>
     */
    public function tiersOf(array $ids): array
    {
        return array_map(fn (int $rating) => LeagueTier::fromRating($rating)->slug(), $this->ratingsOf($ids));
    }

    /**
     * `RatingBoardResponse` in `packages/types`: the highest ratings of the
     * players who counted a rated run lately — everyone's, among friends, or
     * in the viewer's own league (none before they are placed). It never
     * resets: the league is the rating's.
     *
     * @return array<string, mixed>
     */
    public function board(User $viewer, string $scope): array
    {
        $among = $scope === 'friends' ? [...$this->friends->ids($viewer), $viewer->id] : null;
        $league = $scope === 'league' ? $this->tierOf($viewer) : null;
        if ($scope === 'league' && $league === null) {
            return ['scope' => $scope, 'entries' => [], 'me' => null, 'players' => 0];
        }
        $query = fn (): Builder => PlayerRating::query()
            ->join('users', 'users.id', '=', 'player_ratings.user_id')
            ->whereNull('users.banned_at')
            ->whereNotNull('player_ratings.rating')
            ->where('player_ratings.rated_at', '>=', now()->subDays((int) $this->config['board_active_days']))
            ->when($among !== null, fn (Builder $query) => $query->whereIn('player_ratings.user_id', $among))
            ->when($league !== null, fn (Builder $query) => $query->where('player_ratings.tier', $league->value));
        $columns = ['player_ratings.user_id', 'player_ratings.rating', 'player_ratings.changed_at', 'users.username', 'users.avatar'];

        $top = $query()
            ->orderByDesc('player_ratings.rating')
            ->orderBy('player_ratings.changed_at')
            ->orderBy('player_ratings.user_id')
            ->limit((int) $this->config['board_limit'])
            ->get($columns);
        $mine = $query()->where('player_ratings.user_id', $viewer->id)->first($columns);
        $ahead = fn (): Builder => $query()->where(fn (Builder $q) => $q
            ->where('player_ratings.rating', '>', $mine->rating)
            ->orWhere(fn (Builder $q) => $q
                ->where('player_ratings.rating', $mine->rating)
                ->where('player_ratings.changed_at', '<', $mine->getRawOriginal('changed_at'))));

        $friends = $this->friends->among($viewer, [...$top->pluck('user_id')->all(), ...($mine === null ? [] : [$mine->user_id])]);
        $entry = fn (PlayerRating $row, int $rank, ?PlayerRating $over) => [
            'rank' => $rank,
            'username' => (string) $row->getAttribute('username'),
            'avatarUrl' => AvatarService::url($row->getAttribute('avatar')),
            'rating' => (int) $row->rating,
            'tier' => LeagueTier::fromRating((int) $row->rating)->slug(),
            'isMe' => $row->user_id === $viewer->id,
            'isFriend' => isset($friends[$row->user_id]),
            'gap' => $over === null ? null : (int) $over->rating - (int) $row->rating + 1,
        ];

        $entries = [];
        $over = null;
        foreach ($top->values() as $position => $row) {
            $entries[] = $entry($row, $position + 1, $over);
            $over = $row;
        }

        $me = null;
        if ($mine !== null) {
            $above = $ahead()
                ->orderBy('player_ratings.rating')
                ->orderByDesc('player_ratings.changed_at')
                ->orderByDesc('player_ratings.user_id')
                ->first($columns);
            $me = $entry($mine, $ahead()->count() + 1, $above);
        }

        return [
            'scope' => $scope,
            'entries' => $entries,
            'me' => $me,
            'players' => $query()->count(),
        ];
    }

    /**
     * A player's latest changes, newest first — what the league screen lists.
     * Only what set or moved the rating: runs that did not count, and the
     * placement runs before the last, are left out.
     *
     * @return list<array<string, mixed>>
     */
    public function history(User $user, ?int $limit = null): array
    {
        return RatingChange::query()
            ->where('user_id', $user->id)
            ->where('kind', '!=', RatingKind::Void->value)
            ->whereNotNull('after')
            ->orderByDesc('id')
            ->limit($limit ?? (int) $this->config['history'])
            ->get()
            ->map(fn (RatingChange $change) => self::presentChange($change))
            ->all();
    }

    /**
     * `RatingChange` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public static function presentChange(RatingChange $change): array
    {
        return [
            'kind' => $change->kind->value,
            'delta' => $change->delta,
            'before' => $change->before,
            'after' => $change->after,
            'score' => $change->score,
            'target' => $change->target === null ? null : TargetTable::roundUp($change->target),
            'tier' => $change->tier_after?->slug(),
            'runId' => $change->run_id,
            'at' => Timestamp::iso($change->created_at),
        ];
    }

    /**
     * Opens the player's rating row — made on their first rated run — locked
     * for the rest of the transaction, and hands the row to `$then`.
     *
     * @template T
     *
     * @param  Closure(PlayerRating): T  $then
     * @return T
     */
    private function write(User $user, Closure $then): mixed
    {
        return DB::transaction(function () use ($user, $then) {
            $now = now();
            PlayerRating::query()->insertOrIgnore([
                'user_id' => $user->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $rating = PlayerRating::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            return $then($rating);
        });
    }

    /**
     * Counts one run's result, or notes that it did not count.
     *
     * @return array<string, mixed>
     */
    private function settle(PlayerRating $rating, Run $run, RatingKind $kind): array
    {
        $counted = RatingChange::query()->where('run_id', $run->id)->first();
        if ($counted !== null) {
            return $this->viewOf($rating, $counted);
        }

        // Placement is played at difficulty 0 and measured with the engine's own
        // targets; a placed player's run with the targets of its difficulty.
        $table = $rating->isPlaced() ? TargetTable::forRun($run) : TargetTable::forEngine($run->engine_version);
        if ($table === null || $kind === RatingKind::Void) {
            return $this->viewOf($rating, $this->record($rating, RatingKind::Void, $rating->rating, [
                'run_id' => $run->id,
                'score' => $run->score,
                'engine_version' => $run->engine_version,
            ]));
        }

        $score = $kind === RatingKind::Forfeit ? null : (int) $run->score;

        return $rating->isPlaced()
            ? $this->count($rating, $run, $kind, $score, $table)
            : $this->place($rating, $run, $kind, $score, $table);
    }

    /**
     * One more placement result. The last one places the player: the rating
     * whose typical score is their median, held inside Gümüş.
     *
     * @return array<string, mixed>
     */
    private function place(PlayerRating $rating, Run $run, RatingKind $kind, ?int $score, TargetTable $table): array
    {
        $now = now();
        $scores = [...($rating->placement_scores ?? []), $score ?? 0];
        $rating->placement_scores = $scores;
        $rating->rated_runs++;
        $rating->rated_at = $now;
        $values = [
            'run_id' => $run->id,
            'score' => $score,
            'engine_version' => $run->engine_version,
        ];

        if (count($scores) < (int) $this->config['placement_runs']) {
            $rating->save();

            return $this->viewOf($rating, $this->record($rating, $kind === RatingKind::Forfeit ? $kind : RatingKind::Placement, null, $values));
        }

        $median = TargetTable::median($scores);
        $performance = $table->performance($median);
        $start = max((int) $this->config['placement_min'], min((int) $this->config['placement_max'], $performance ?? 0));
        $rating->provisional_left = (int) $this->config['provisional_runs'];
        $this->move($rating, $start, $now);
        $rating->save();

        return $this->viewOf($rating, $this->record($rating, $kind === RatingKind::Forfeit ? $kind : RatingKind::Placement, null, $values + [
            'performance' => $performance,
        ]));
    }

    /**
     * A placed player's run against their target.
     *
     * @return array<string, mixed>
     */
    private function count(PlayerRating $rating, Run $run, RatingKind $kind, ?int $score, TargetTable $table): array
    {
        $now = now();
        $before = (int) $rating->rating;
        $tierBefore = LeagueTier::fromRating($before);

        if ($rating->rated_at !== null && $rating->rated_at->lt($now->copy()->subDays((int) $this->config['return_after_days']))) {
            $rating->provisional_left = max($rating->provisional_left, (int) $this->config['return_provisional_runs']);
        }
        $width = (int) $this->config[$rating->provisional_left > 0 ? 'provisional_width' : 'width'];
        $max = (int) $this->config['max_delta'];
        $performance = $score === null ? null : $table->performance($score);

        $delta = $kind === RatingKind::Forfeit ? -$max : TargetTable::delta($before, $performance, $width, $max);
        if ($delta < 0 && $tierBefore->isBottom()) {
            $delta = -intdiv(-$delta * (int) $this->config['bronze_loss_percent'] + 99, 100);
        }
        $after = max(0, $before + $delta);

        // A fresh promotion holds against bad luck — not against leaving.
        $shielded = false;
        if ($rating->shield_tier !== null && $rating->shield_left > 0) {
            if ($kind === RatingKind::Run && $after < $rating->shield_tier->floor()) {
                $after = $rating->shield_tier->floor();
                $shielded = true;
            }
            $rating->shield_left--;
        }
        $rating->provisional_left = max(0, $rating->provisional_left - 1);
        $rating->rated_runs++;
        $rating->rated_at = $now;
        $this->move($rating, $after, $now);
        if (LeagueTier::fromRating($after)->value > $tierBefore->value) {
            $rating->shield_tier = LeagueTier::fromRating($after);
            $rating->shield_left = (int) $this->config['shield_runs'];
        }
        $rating->save();

        return $this->viewOf($rating, $this->record($rating, $kind, $before, [
            'run_id' => $run->id,
            'score' => $score,
            'target' => (int) round($table->target($before)),
            'performance' => $performance,
            'width' => $width,
            'shielded' => $shielded,
            'engine_version' => $run->engine_version,
        ]));
    }

    /**
     * Sets a new rating, keeps the peak and the moment it moved, and drops a
     * shield the player has fallen out of anyway.
     */
    private function move(PlayerRating $rating, int $after, Carbon $now): void
    {
        if ($rating->rating !== $after) {
            $rating->changed_at = $now;
        }
        $rating->rating = $after;
        $rating->tier = LeagueTier::fromRating($after);
        $rating->peak = max($rating->peak ?? 0, $after);
        if ($rating->shield_tier !== null && ($rating->shield_left === 0 || $rating->tier->value < $rating->shield_tier->value)) {
            $rating->shield_tier = null;
            $rating->shield_left = 0;
        }
    }

    /**
     * Writes the change from `$before` to where the rating is now.
     *
     * @param  array<string, mixed>  $values
     */
    private function record(PlayerRating $rating, RatingKind $kind, ?int $before, array $values = []): RatingChange
    {
        $after = $rating->rating;

        return RatingChange::query()->create([
            'user_id' => $rating->user_id,
            'kind' => $kind,
            'before' => $before,
            'after' => $after,
            'delta' => $before === null || $after === null ? 0 : $after - $before,
            'tier_before' => $before === null ? null : LeagueTier::fromRating($before),
            'tier_after' => $after === null ? null : LeagueTier::fromRating($after),
            'shielded' => false,
            'created_at' => now(),
            ...$values,
        ]);
    }

    /**
     * Which way a finished run counts: a banned player's never; a run flagged
     * for how it was played as a forfeit; one flagged only for its phone, or
     * given up in the countdown, not at all.
     */
    private function kindOf(Run $run): RatingKind
    {
        if ($run->user->isBanned()) {
            return RatingKind::Void;
        }
        if ($run->status === RunStatus::Flagged) {
            $hard = collect($run->flags ?? [])
                ->filter(fn (array $flag) => ($flag['severity'] ?? null) === 'hard')
                ->map(fn (array $flag) => RunFlag::tryFrom((string) $flag['code']))
                ->filter();
            if ($hard->contains(RunFlag::Banned)) {
                return RatingKind::Void;
            }

            return $hard->contains(fn (RunFlag $flag) => ! in_array($flag, self::SPARED_FLAGS, true))
                ? RatingKind::Forfeit
                : RatingKind::Void;
        }
        $window = (int) $this->config['void_window_seconds'];
        if ((int) $run->reels === 0 && $run->finished_at !== null && $run->started_at->diffInSeconds($run->finished_at) <= $window) {
            return RatingKind::Void;
        }

        return RatingKind::Run;
    }

    /**
     * `RunRating` for a held run: nothing moves until a moderator decides.
     *
     * @return array<string, mixed>
     */
    private function pending(PlayerRating $rating): array
    {
        return [
            'kind' => 'pending',
            'before' => $rating->rating,
            'after' => $rating->rating,
            'delta' => 0,
            'tierBefore' => $rating->tier?->slug(),
            'tier' => $rating->tier?->slug(),
            'target' => null,
            'nextTarget' => $this->nextTarget($rating),
            'placement' => $this->placementOf($rating),
            'shielded' => false,
        ];
    }

    /**
     * `RunRating` in `packages/types`, from the change a run made.
     *
     * @return array<string, mixed>
     */
    private function viewOf(PlayerRating $rating, RatingChange $change): array
    {
        $placing = $change->before === null && in_array($change->kind, [RatingKind::Placement, RatingKind::Forfeit], true);

        return [
            'kind' => $placing ? RatingKind::Placement->value : $change->kind->value,
            'before' => $change->before,
            'after' => $change->after,
            'delta' => $change->delta,
            'tierBefore' => $change->tier_before?->slug(),
            'tier' => $change->tier_after?->slug(),
            'target' => $change->target === null ? null : TargetTable::roundUp($change->target),
            'nextTarget' => $this->nextTarget($rating),
            'placement' => $placing || ! $rating->isPlaced() ? [
                'played' => min((int) $this->config['placement_runs'], count($rating->placement_scores ?? [])),
                'required' => (int) $this->config['placement_runs'],
            ] : null,
            'shielded' => $change->shielded,
        ];
    }

    /** @return array{played: int, required: int}|null */
    private function placementOf(PlayerRating $rating): ?array
    {
        return $rating->isPlaced() ? null : [
            'played' => count($rating->placement_scores ?? []),
            'required' => (int) $this->config['placement_runs'],
        ];
    }

    private function nextTarget(PlayerRating $rating): ?int
    {
        return $rating->isPlaced()
            ? TargetTable::forDifficulty($this->engineVersion, $this->difficultyVersion)?->shown((int) $rating->rating)
            : null;
    }

    /**
     * `RatingResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    private function present(PlayerRating $rating, User $user): array
    {
        $tier = $rating->isPlaced() ? LeagueTier::fromRating((int) $rating->rating) : null;
        $ceil = $tier?->ceil();

        return [
            'unlock' => $this->unlock($user),
            'placed' => $rating->isPlaced(),
            'rating' => $rating->rating,
            'tier' => $tier?->slug(),
            'floor' => $tier?->floor(),
            'ceil' => $ceil,
            'progress' => $tier === null || $ceil === null ? null : intdiv(((int) $rating->rating - $tier->floor()) * 1000, $ceil - $tier->floor()),
            'target' => $this->nextTarget($rating),
            'difficulty' => $this->difficultyAt($rating->rating),
            'peak' => $rating->peak,
            'placement' => $this->placementOf($rating),
            'provisional' => $rating->isPlaced() && $rating->provisional_left > 0,
            'shield' => $rating->shield_tier !== null && $rating->shield_left > 0
                ? ['tier' => $rating->shield_tier->slug(), 'runs' => $rating->shield_left]
                : null,
            'history' => $this->history($user),
        ];
    }
}
