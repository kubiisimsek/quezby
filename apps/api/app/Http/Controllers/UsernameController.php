<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\CheckUsernameRequest;
use App\Http\Requests\UpdateUsernameRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Support\Username;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;

class UsernameController extends Controller
{
    public function check(CheckUsernameRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $input = $request->username();
        $result = Username::validate($input);

        if ($result->problem !== null) {
            return response()->json([
                'username' => Username::normalize($input),
                'available' => false,
                'reason' => $result->problem->value,
            ]);
        }

        $taken = User::query()
            ->where('username', $result->normalized)
            ->whereKeyNot($user->getKey())
            ->exists();

        return response()->json([
            'username' => $result->normalized,
            'available' => ! $taken,
            'reason' => $taken ? 'taken' : null,
        ]);
    }

    /**
     * A name is picked once — only over the one the API gave, or none — and
     * then it never changes; the same name again is a harmless no-op. The
     * write holds only while the name is still the one the player had, so two
     * quick picks cannot both land, and the unique index decides a race
     * between two players: one gets the name, the other a 409.
     */
    public function update(UpdateUsernameRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $username = $request->normalizedUsername();

        if ($user->username !== $username) {
            if (! Username::isPickable($user->username)) {
                throw ApiException::of(ErrorCode::UsernameLocked);
            }
            if (User::query()->where('username', $username)->whereKeyNot($user->getKey())->exists()) {
                throw ApiException::of(ErrorCode::UsernameTaken);
            }

            $pick = User::query()->whereKey($user->getKey());
            $user->username === null ? $pick->whereNull('username') : $pick->where('username', $user->username);
            try {
                $landed = $pick->update(['username' => $username]);
            } catch (UniqueConstraintViolationException) {
                throw ApiException::of(ErrorCode::UsernameTaken);
            }

            $user->refresh();
            if ($landed === 0 && $user->username !== $username) {
                throw ApiException::of(ErrorCode::UsernameLocked);
            }
        }

        return response()->json(['user' => new MeResource($user)]);
    }
}
