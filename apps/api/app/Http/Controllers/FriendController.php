<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Services\Social\FriendService;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class FriendController extends Controller
{
    public function __construct(
        private readonly FriendService $friends,
        private readonly PlayerDirectory $players,
    ) {}

    /** Sends a request, or accepts theirs. Idempotent — `RelationResponse`. */
    public function store(string $username, #[CurrentUser] User $user): JsonResponse
    {
        $other = $this->players->find($username, $user) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json(['relation' => $this->friends->add($user, $other)->value]);
    }

    /**
     * Takes a request back, turns one down or ends a friendship. Idempotent;
     * a banned player can still be let go of, so no hidden row is stuck.
     */
    public function destroy(string $username, #[CurrentUser] User $user): JsonResponse
    {
        $other = $this->players->named($username) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json(['relation' => $this->friends->remove($user, $other)->value]);
    }

    /** `FriendRequestsResponse`: what waits for the player, and what they sent. */
    public function requests(#[CurrentUser] User $user): JsonResponse
    {
        $requests = $this->friends->requests($user);

        return response()->json([
            'incoming' => $this->entries($user, $requests['incoming']),
            'outgoing' => $this->entries($user, $requests['outgoing']),
        ]);
    }

    /**
     * @param  Collection<int, User>  $players  Each with `requested_at`.
     * @return list<array{player: array<string, mixed>, requestedAt: string|null}>
     */
    private function entries(User $user, Collection $players): array
    {
        $summaries = $this->players->summaries($user, $players);

        return $players->values()->map(fn (User $player, int $i) => [
            'player' => $summaries[$i],
            'requestedAt' => Timestamp::isoStored($player->getAttribute('requested_at')),
        ])->all();
    }
}
