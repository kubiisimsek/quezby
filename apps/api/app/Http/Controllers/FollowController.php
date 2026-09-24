<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\FollowListRequest;
use App\Models\User;
use App\Services\FollowService;
use App\Services\PlayerDirectory;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class FollowController extends Controller
{
    public function __construct(
        private readonly FollowService $follows,
        private readonly PlayerDirectory $players,
    ) {}

    /** Idempotent: following someone already followed is a 204 too, even at the limit. */
    public function store(string $username, #[CurrentUser] User $user): Response
    {
        $this->follows->follow($user, $this->players->find($username, $user) ?? throw ApiException::of(ErrorCode::NotFound));

        return response()->noContent();
    }

    /** Idempotent. A banned player can still be unfollowed, so no hidden row is stuck. */
    public function destroy(string $username, #[CurrentUser] User $user): Response
    {
        $this->follows->unfollow($user, $this->players->named($username) ?? throw ApiException::of(ErrorCode::NotFound));

        return response()->noContent();
    }

    public function following(FollowListRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return $this->list($user, $this->follows->following($user, $request->cursor()));
    }

    public function followers(FollowListRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return $this->list($user, $this->follows->followers($user, $request->cursor()));
    }

    /**
     * `FollowListResponse` in `packages/types`.
     *
     * @param  array{users: Collection<int, User>, nextCursor: string|null}  $page
     */
    private function list(User $user, array $page): JsonResponse
    {
        return response()->json([
            'users' => $this->players->summaries($user, $page['users']),
            'nextCursor' => $page['nextCursor'],
        ]);
    }
}
