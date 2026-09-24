<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\SearchUsersRequest;
use App\Models\User;
use App\Services\PlayerDirectory;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly PlayerDirectory $players,
    ) {}

    /** Players whose username starts with what was typed — not the caller, not a banned player. */
    public function search(SearchUsersRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json(['users' => $this->players->search($user, $request->prefix())]);
    }

    /** A player's card. A banned player is not found, except by themselves. */
    public function show(string $username, #[CurrentUser] User $user): JsonResponse
    {
        $player = $this->players->find($username, $user) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json(['player' => $this->players->card($user, $player)]);
    }
}
