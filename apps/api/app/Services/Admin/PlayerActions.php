<?php

namespace App\Services\Admin;

use App\Enums\AuditAction;
use App\Enums\ErrorCode;
use App\Enums\LeagueTier;
use App\Exceptions\ApiException;
use App\Models\User;
use App\Services\AccountDeletion;
use App\Services\Identity\GuestNames;
use App\Services\Push\PushService;
use App\Services\Rating\RatingService;
use App\Services\Social\ReportService;
use App\Support\Actor;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * What the admin panel does to a player beyond bans (`ModerationService`):
 * take a name off the boards, end their sessions, set their rating by hand,
 * delete the account. Every one is audited.
 */
final class PlayerActions
{
    public function __construct(
        private readonly GuestNames $names,
        private readonly AccountDeletion $deletion,
        private readonly AuditLog $audit,
        private readonly ReportService $reports,
        private readonly RatingService $ratings,
        private readonly PushService $push,
    ) {}

    /**
     * Gives the player a fresh automatic name — `guest` and eight digits — in
     * place of one that should not be seen. That opens one more pick, and the
     * name they pick is theirs for good again; the old one is in the audit log.
     * The reports about the old name close.
     */
    public function rename(User $player, string $reason, Actor $actor): string
    {
        $old = $player->username;
        $give = fn () => $player->forceFill(['username' => $this->names->mint()])->save();

        DB::transaction(function () use ($give, $player, $old, $reason, $actor) {
            try {
                $give();
            } catch (UniqueConstraintViolationException) {
                $give();
            }
            $this->audit->record($actor, AuditAction::PlayerRename, $player, $reason, ['from' => $old, 'to' => $player->username]);
            $this->reports->nameReset($player, $actor);
        });

        return (string) $player->username;
    }

    /**
     * Ends every session the player has, so each phone signs in again. Not
     * for a guest: their token is the only key to the account, and ending it
     * would lose the account for good.
     *
     * @return int The sessions that ended.
     */
    public function signOut(User $player, Actor $actor): int
    {
        if ($player->isGuest()) {
            throw new ApiException(
                ErrorCode::ValidationFailed,
                'Misafir hesabın oturumu kapatılamaz: tek anahtarı o oturum, kapanırsa hesap kaybolur.',
            );
        }

        return DB::transaction(function () use ($player, $actor) {
            $ended = $player->tokens()->delete();
            $this->audit->record($actor, AuditAction::PlayerSignOut, $player, details: ['sessions' => $ended]);

            return $ended;
        });
    }

    /**
     * Sends the player's phones a push from the panel — now, whatever their
     * settings — and says what Firebase answered for each (`PushService::test`).
     * On the audit log with its words and how many phones took it.
     *
     * @return array{problem: string|null, devices: int, delivered: int, results: list<array<string, mixed>>}
     */
    public function push(User $player, string $title, string $body, Actor $actor): array
    {
        $result = $this->push->test($player, $title, $body);
        $this->audit->record($actor, AuditAction::PlayerPush, $player, details: [
            'title' => $title,
            'body' => $body,
            'devices' => $result['devices'],
            'delivered' => $result['delivered'],
            'problem' => $result['problem'],
        ]);

        return $result;
    }

    /**
     * Sets the player's rating (qb) by hand — an owner's call, to test the
     * leagues or put a rating right (`RatingService::adjust`): on the
     * player's history as `adjust`, and in the audit log with where it was
     * and where it went. The rating it has already changes nothing and
     * records nothing.
     *
     * @return array{changed: bool, rating: int, tier: string}
     */
    public function setRating(User $player, int $rating, string $reason, Actor $actor): array
    {
        $moved = DB::transaction(function () use ($player, $rating, $reason, $actor) {
            $moved = $this->ratings->adjust($player, $rating);
            if ($moved !== null) {
                $this->audit->record($actor, AuditAction::PlayerRating, $player, $reason, $moved);
            }

            return $moved;
        });

        return ['changed' => $moved !== null, 'rating' => $rating, 'tier' => LeagueTier::fromRating($rating)->slug()];
    }

    /** Deletes the account for good — runs, board rows, sessions — and keeps the audit line. */
    public function delete(User $player, string $reason, Actor $actor): void
    {
        $details = [
            'runs' => $player->runs()->count(),
            'email' => $player->email !== null,
            'identities' => $player->identities()->pluck('provider')->map(fn ($provider) => is_string($provider) ? $provider : $provider->value)->all(),
        ];

        $this->deletion->delete($player);
        $this->audit->record($actor, AuditAction::PlayerDelete, $player, $reason, $details);
    }
}
