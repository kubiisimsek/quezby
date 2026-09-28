<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateAvatarRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class AvatarController extends Controller
{
    public function __construct(
        private readonly AvatarService $avatars,
    ) {}

    /** A new profile photo — `{ user: Me }` with its `avatarUrl`. */
    public function update(UpdateAvatarRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $this->avatars->store($user, $request->bytes());

        return response()->json(['user' => new MeResource($user->refresh())]);
    }

    /** No profile photo any more. Idempotent. */
    public function destroy(#[CurrentUser] User $user): JsonResponse
    {
        $this->avatars->remove($user);

        return response()->json(['user' => new MeResource($user->refresh())]);
    }
}
