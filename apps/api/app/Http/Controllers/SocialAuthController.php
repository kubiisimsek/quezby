<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Http\Requests\AppleSignInRequest;
use App\Http\Requests\GoogleSignInRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\AppleIdentityVerifier;
use App\Services\Identity\GoogleIdentityVerifier;
use App\Services\Identity\NonceService;
use App\Services\Identity\SocialAccountService;
use App\Support\Timestamp;
use Illuminate\Http\JsonResponse;

class SocialAuthController extends Controller
{
    /** A single-use nonce for Sign in with Apple. */
    public function nonce(NonceService $nonces): JsonResponse
    {
        ['nonce' => $nonce, 'expiresAt' => $expiresAt] = $nonces->issue();

        return response()->json(['nonce' => $nonce, 'expiresAt' => Timestamp::iso($expiresAt)], 201);
    }

    /** Signs in with Apple — or up, when the Apple account is new to Quezby. */
    public function apple(AppleSignInRequest $request, AppleIdentityVerifier $verifier, SocialAccountService $accounts): JsonResponse
    {
        $identity = $verifier->verify($request->identityToken(), $request->nonce());

        return $this->signedIn(
            $accounts->signIn($identity, $request->platform(), $request->installId(), $request->authorizationCode()),
            $request->platform(),
        );
    }

    /** Signs in with Google — or up, when the Google account is new to Quezby. */
    public function google(GoogleSignInRequest $request, GoogleIdentityVerifier $verifier, SocialAccountService $accounts): JsonResponse
    {
        $identity = $verifier->verify($request->idToken());

        return $this->signedIn(
            $accounts->signIn($identity, $request->platform(), $request->installId()),
            $request->platform(),
        );
    }

    /**
     * `SocialAuthResponse`: 201 for a new player, 200 for one coming back.
     *
     * @param  array{user: User, created: bool}  $account
     */
    private function signedIn(array $account, Platform $platform): JsonResponse
    {
        return response()->json([
            'token' => $account['user']->createToken($platform->value)->plainTextToken,
            'user' => new MeResource($account['user']),
            'created' => $account['created'],
        ], $account['created'] ? 201 : 200);
    }
}
