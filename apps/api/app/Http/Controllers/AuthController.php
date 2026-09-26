<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Exceptions\ApiException;
use App\Http\Requests\GuestSignUpRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\GuestNames;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * A new account with no email or password — the token is its only key —
     * playing as `guest48128742` until its player picks a name, in the
     * request's language. Two sign-ups that drew the same name at once: the
     * loser draws again.
     */
    public function guest(GuestSignUpRequest $request, GuestNames $names): JsonResponse
    {
        $create = fn () => User::create([
            'username' => $names->mint(),
            'platform' => $request->validated('platform'),
            'install_id' => $request->validated('installId'),
            'locale' => Locale::current(),
        ]);

        try {
            $user = $create();
        } catch (UniqueConstraintViolationException) {
            $user = $create();
        }

        return response()->json([
            'token' => $user->createToken($user->platform ?? 'app')->plainTextToken,
            'user' => new MeResource($user),
        ], 201);
    }

    /** Only accounts that linked an email can sign in this way. */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', Str::lower($request->validated('email')))->first();

        if ($user === null || $user->password === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ApiException::of(ErrorCode::InvalidCredentials);
        }

        return response()->json([
            'token' => $user->createToken('login')->plainTextToken,
            'user' => new MeResource($user),
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
