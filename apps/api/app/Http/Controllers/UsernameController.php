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

    /** The unique index decides a race: one player gets the name, the other a 409. */
    public function update(UpdateUsernameRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $username = $request->normalizedUsername();

        if ($user->username !== $username) {
            if (User::query()->where('username', $username)->exists()) {
                throw ApiException::of(ErrorCode::UsernameTaken);
            }

            try {
                $user->forceFill(['username' => $username])->save();
            } catch (UniqueConstraintViolationException) {
                throw ApiException::of(ErrorCode::UsernameTaken);
            }
        }

        return response()->json(['user' => new MeResource($user)]);
    }
}
