<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use App\Services\PlayerDirectory;
use App\Services\Social\FriendService;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class BlockController extends Controller
{
    public function __construct(
        private readonly FriendService $friends,
        private readonly PlayerDirectory $players,
    ) {}

    /**
     * Blocks a player: their friendship, requests and open VS end, and they
     * can no longer find the blocker. Idempotent — `RelationResponse`.
     */
    public function store(string $username, #[CurrentUser] User $user): JsonResponse
    {
        $other = $this->players->find($username, $user) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json(['relation' => $this->friends->block($user, $other)->value]);
    }

    /** Lifts a block — of a banned player too. Idempotent. */
    public function destroy(string $username, #[CurrentUser] User $user): JsonResponse
    {
        $other = $this->players->named($username) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json(['relation' => $this->friends->unblock($user, $other)->value]);
    }

    /** `BlocksResponse`: everyone the player blocked, the latest first. */
    public function index(#[CurrentUser] User $user): JsonResponse
    {
        return response()->json([
            'users' => $this->friends->blocked($user)->map(fn (User $player) => [
                'username' => (string) $player->username,
                'avatarUrl' => AvatarService::url($player->avatar),
                'blockedAt' => Timestamp::isoStored($player->getAttribute('blocked_at')),
            ])->values()->all(),
        ]);
    }
}
