<?php

namespace App\Services\Social;

use App\Enums\DuelStatus;
use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Enums\MessageKind;
use App\Enums\RunStatus;
use App\Exceptions\ApiException;
use App\Models\Duel;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * VS: two friends, one seed, one attempt each — and nothing else. A VS run
 * is replayed and checked like any other, but it never reaches a board, a
 * league, a stat or a record; its only mark is on the VS.
 *
 * The challenger plays first. A clean run sends the VS: the friend is told,
 * without the score, and has `duels.expire_hours` to start theirs. Once both
 * have played, the higher clean score wins; a run that was not clean, or was
 * left unfinished, loses. A VS nobody answered in time counts for nobody.
 * Nothing runs on a clock: a VS is settled whenever one of the two looks.
 */
final class DuelService
{
    public function __construct(
        private readonly FriendService $friends,
        private readonly Messenger $messenger,
        #[Config('quezby.duels.expire_hours')]
        private readonly int $expireHours,
        #[Config('quezby.duels.waiting_limit')]
        private readonly int $waitingLimit,
        #[Config('quezby.runs.ttl_minutes')]
        private readonly int $runTtlMinutes,
        #[Config('quezby.engine_version')]
        private readonly int $engineVersion,
    ) {}

    /**
     * Opens a VS against a friend: its seed, and the challenger's turn to
     * play. The friend hears of it only once that run is in, and clean.
     */
    public function challenge(User $challenger, User $opponent, int $contentVersion): Duel
    {
        if ($challenger->is($opponent) || ! $this->friends->areFriends($challenger, $opponent)) {
            throw ApiException::of(ErrorCode::NotFriends);
        }

        $open = Duel::query()->where('open_pair', Duel::pairOf($challenger->id, $opponent->id))->first();
        if ($open !== null && $this->settle($open)->status->isOpen()) {
            throw ApiException::of(ErrorCode::DuelUnavailable);
        }
        $waiting = Duel::query()->where('challenger_id', $challenger->id)->where('status', DuelStatus::Waiting)->count();
        if ($waiting >= $this->waitingLimit) {
            throw new ApiException(ErrorCode::DuelLimit, ErrorCode::DuelLimit->message(['limit' => Locale::current()->group($this->waitingLimit)]));
        }

        try {
            return Duel::query()->create([
                'challenger_id' => $challenger->id,
                'opponent_id' => $opponent->id,
                'seed' => random_int(1, 4294967295),
                'engine_version' => $this->engineVersion,
                'content_version' => $contentVersion,
                'status' => DuelStatus::Playing,
                'open_pair' => Duel::pairOf($challenger->id, $opponent->id),
            ]);
        } catch (UniqueConstraintViolationException) {
            // The other one sent theirs at the same moment.
            throw ApiException::of(ErrorCode::DuelUnavailable);
        }
    }

    /**
     * The VS a friend was sent, ready for their one attempt: it must still
     * wait for them, and they must not have started it already.
     */
    public function answer(User $opponent, string $duelId): Duel
    {
        $duel = Duel::query()->find($duelId);
        if ($duel === null || $duel->opponent_id !== $opponent->id) {
            throw ApiException::of(ErrorCode::NotFound);
        }
        $duel = $this->settle($duel);
        if ($duel->status !== DuelStatus::Waiting || $duel->opponent_run_id !== null) {
            throw ApiException::of(ErrorCode::DuelUnavailable);
        }

        return $duel;
    }

    /** Ties a started run to its side of the VS. */
    public function attach(Duel $duel, Run $run): void
    {
        $side = $duel->challenger_id === $run->user_id ? 'challenger_run_id' : 'opponent_run_id';
        $duel->forceFill([$side => $run->id])->save();
    }

    /**
     * Settles what a finished VS run did: the challenger's clean run sends
     * the VS, an unclean one voids it; the friend's run ends it.
     */
    public function onRunFinished(Run $run): ?Duel
    {
        if ($run->duel_id === null) {
            return null;
        }

        return DB::transaction(function () use ($run) {
            $duel = Duel::query()->lockForUpdate()->find($run->duel_id);
            if ($duel === null) {
                return null;
            }
            $clean = $run->status === RunStatus::Played;

            if ($duel->challenger_run_id === $run->id && $duel->status === DuelStatus::Playing) {
                if ($clean) {
                    $duel->forceFill([
                        'status' => DuelStatus::Waiting,
                        'challenger_score' => $run->score,
                        'challenger_valid' => true,
                        'sent_at' => now(),
                        'expires_at' => now()->addHours($this->expireHours),
                    ])->save();
                    $this->messenger->say($duel->challenger, $duel->opponent, MessageKind::VsInvite, duel: $duel);
                } else {
                    $duel->forceFill([
                        'status' => DuelStatus::Void,
                        'challenger_score' => $run->score,
                        'challenger_valid' => false,
                        'open_pair' => null,
                        'finished_at' => now(),
                    ])->save();
                }
            } elseif ($duel->opponent_run_id === $run->id && $duel->status === DuelStatus::Waiting) {
                $this->end($duel, $run->score, $clean);
            }

            return $duel;
        });
    }

    /** The friend says no. Only a VS still waiting for them, not yet started. */
    public function decline(User $opponent, string $duelId): Duel
    {
        $duel = $this->answer($opponent, $duelId);
        DB::transaction(function () use ($duel) {
            $duel->forceFill(['status' => DuelStatus::Declined, 'open_pair' => null, 'finished_at' => now()])->save();
            $this->messenger->say($duel->opponent, $duel->challenger, MessageKind::VsDeclined, duel: $duel);
        });

        return $duel;
    }

    /**
     * Brings an open VS up to date: a challenger's run left unfinished voids
     * it; a friend's run left unfinished loses it; a VS nobody started in
     * time — or one from before a rules change — runs out.
     */
    public function settle(Duel $duel): Duel
    {
        if (! $duel->status->isOpen()) {
            return $duel;
        }

        return DB::transaction(function () use ($duel) {
            $duel = Duel::query()->lockForUpdate()->find($duel->id) ?? $duel;
            if ($duel->status === DuelStatus::Playing && $this->runGone($duel->challenger_run_id, $duel)) {
                $duel->forceFill(['status' => DuelStatus::Void, 'challenger_valid' => false, 'open_pair' => null, 'finished_at' => now()])->save();
            } elseif ($duel->status === DuelStatus::Waiting && $duel->opponent_run_id === null) {
                if ($duel->expires_at?->isPast() || $duel->engine_version !== $this->engineVersion) {
                    $duel->forceFill(['status' => DuelStatus::Expired, 'open_pair' => null, 'finished_at' => now()])->save();
                    $this->messenger->say($duel->opponent, $duel->challenger, MessageKind::VsExpired, duel: $duel);
                }
            } elseif ($duel->status === DuelStatus::Waiting && $this->runGone($duel->opponent_run_id, $duel)) {
                $this->end($duel, null, false);
            }

            return $duel;
        });
    }

    /** Settles every open VS a player is part of — before their inbox is read. */
    public function settleFor(User $user): void
    {
        Duel::query()
            ->whereIn('status', [DuelStatus::Playing, DuelStatus::Waiting])
            ->where(fn ($query) => $query->where('challenger_id', $user->id)->orWhere('opponent_id', $user->id))
            ->get()
            ->each(fn (Duel $duel) => $this->settle($duel));
    }

    /**
     * Settles a player's waiting VS whose time ran out — on each pulse, so
     * both sides hear of it without opening anything. Whether there was one.
     */
    public function settleDue(User $user): bool
    {
        $due = Duel::query()
            ->where('status', DuelStatus::Waiting)
            ->whereNull('opponent_run_id')
            ->where('expires_at', '<', now()->format(Timestamp::STORAGE_FORMAT))
            ->where(fn ($query) => $query->where('challenger_id', $user->id)->orWhere('opponent_id', $user->id))
            ->get();
        $due->each(fn (Duel $duel) => $this->settle($duel));

        return $due->isNotEmpty();
    }

    /**
     * The open VS between the two that `$viewer` may see: a challenger sees
     * theirs from the start; the friend only once it was sent.
     */
    public function openFor(User $viewer, User $friend): ?Duel
    {
        $duel = Duel::query()->where('open_pair', Duel::pairOf($viewer->id, $friend->id))->first();
        if ($duel === null) {
            return null;
        }
        $duel = $this->settle($duel);

        return $duel->status->isOpen() && $this->shows($duel, $viewer) ? $duel : null;
    }

    /** Whether `$viewer` knows of this VS: a challenger always, the friend once it was sent. */
    public function shows(Duel $duel, User $viewer): bool
    {
        return $duel->challenger_id === $viewer->id || $duel->status !== DuelStatus::Playing;
    }

    /**
     * `DuelBrief` in `packages/types`, from `$viewer`'s side. The other side's
     * score stays hidden until the viewer has played too — and for good, if
     * they never do.
     *
     * @return array<string, mixed>
     */
    public function brief(User $viewer, Duel $duel): array
    {
        $mine = $duel->challenger_id === $viewer->id;
        $side = fn (bool $challenger) => ($challenger ? $duel->challenger_valid : $duel->opponent_valid) === null ? null : [
            'score' => $challenger ? $duel->challenger_score : $duel->opponent_score,
            'valid' => (bool) ($challenger ? $duel->challenger_valid : $duel->opponent_valid),
        ];

        return [
            'id' => $duel->id,
            'status' => $duel->status->value,
            'turn' => match ($duel->status) {
                DuelStatus::Playing => $mine ? 'you' : null,
                DuelStatus::Waiting => $mine ? 'them' : 'you',
                default => null,
            },
            'you' => $side($mine),
            'them' => $duel->status === DuelStatus::Finished ? $side(! $mine) : null,
            'outcome' => $duel->status !== DuelStatus::Finished ? null : match ($duel->winner_id) {
                null => 'draw',
                $viewer->id => 'won',
                default => 'lost',
            },
            'expiresAt' => $duel->status === DuelStatus::Waiting ? Timestamp::iso($duel->expires_at) : null,
        ];
    }

    /**
     * `DuelView` in `packages/types`: the brief, with who the other player is
     * and how the two stand against each other.
     *
     * @param  array<string, mixed>  $opponent  The other player as a `PlayerSummary`.
     * @return array<string, mixed>
     */
    public function view(User $viewer, Duel $duel, array $opponent): array
    {
        return $this->brief($viewer, $duel) + [
            'sent' => $duel->challenger_id === $viewer->id,
            'opponent' => $opponent,
            'h2h' => $this->h2h($viewer, $duel->otherOf($viewer)),
            'serverTime' => Timestamp::iso(now()),
        ];
    }

    /**
     * How `$user` stands against `$otherId` over every VS they finished.
     *
     * @return array{wins: int, losses: int, draws: int}
     */
    public function h2h(User $user, string $otherId): array
    {
        $winners = Duel::query()
            ->where('status', DuelStatus::Finished)
            ->where(fn ($query) => $query
                ->where(fn ($query) => $query->where('challenger_id', $user->id)->where('opponent_id', $otherId))
                ->orWhere(fn ($query) => $query->where('challenger_id', $otherId)->where('opponent_id', $user->id)))
            ->pluck('winner_id');

        return [
            'wins' => $winners->filter(fn (?string $id) => $id === $user->id)->count(),
            'losses' => $winners->filter(fn (?string $id) => $id === $otherId)->count(),
            'draws' => $winners->filter(fn (?string $id) => $id === null)->count(),
        ];
    }

    /** Ends a sent VS with the friend's run: the higher clean score wins; ties are draws. */
    private function end(Duel $duel, ?int $score, bool $valid): void
    {
        $challenger = (int) $duel->challenger_score;
        $winner = match (true) {
            ! $valid => $duel->challenger_id,
            $score > $challenger => $duel->opponent_id,
            $score < $challenger => $duel->challenger_id,
            default => null,
        };
        $duel->forceFill([
            'status' => DuelStatus::Finished,
            'opponent_score' => $score,
            'opponent_valid' => $valid,
            'winner_id' => $winner,
            'open_pair' => null,
            'finished_at' => now(),
        ])->save();
        $this->messenger->say($duel->opponent, $duel->challenger, MessageKind::VsResult, duel: $duel);
    }

    /**
     * Whether a side's run will never finish: refused, left for another run,
     * run out — or still open past the time a run is given.
     */
    private function runGone(?string $runId, Duel $duel): bool
    {
        $run = $runId === null ? null : Run::query()->find($runId, ['id', 'status', 'started_at']);
        if ($run === null) {
            return $duel->created_at->lessThan(now()->subMinutes($this->runTtlMinutes));
        }

        return in_array($run->status, [RunStatus::Abandoned, RunStatus::Expired, RunStatus::Rejected], true)
            || ($run->status === RunStatus::Started && $run->started_at->lessThan(now()->subMinutes($this->runTtlMinutes)));
    }
}
