<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\LinkCredentialsRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class CredentialsController extends Controller
{
    /**
     * Attaches an email and password to an account without an email — a
     * guest, or a player who signed in with Apple or Google — so it can sign
     * in elsewhere.
     */
    public function __invoke(LinkCredentialsRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        if ($user->email !== null) {
            throw ApiException::of(ErrorCode::AlreadyLinked);
        }

        $email = Str::lower($request->validated('email'));
        if (User::query()->where('email', $email)->exists()) {
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        try {
            $user->forceFill([
                'email' => $email,
                'password' => $request->validated('password'),
            ])->save();
        } catch (UniqueConstraintViolationException) {
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        return response()->json(['user' => new MeResource($user)]);
    }
}
