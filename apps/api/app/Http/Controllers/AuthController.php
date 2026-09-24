<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\GuestSignUpRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /** A new account with no username, email or password; the token is its only key. */
    public function guest(GuestSignUpRequest $request): JsonResponse
    {
        $user = User::create([
            'platform' => $request->validated('platform'),
            'install_id' => $request->validated('installId'),
        ]);

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
