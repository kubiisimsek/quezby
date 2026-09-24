<?php

namespace App\Http\Controllers;

use App\Enums\SocialProvider;
use App\Http\Requests\AppleLinkRequest;
use App\Http\Requests\GoogleLinkRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\AppleIdentityVerifier;
use App\Services\Identity\GoogleIdentityVerifier;
use App\Services\Identity\SocialAccountService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/** `{provider}` is `apple` or `google`; anything else is not found. */
class IdentityController extends Controller
{
    /** Attaches an Apple or Google account, so the player can sign in with it anywhere. */
    public function store(
        SocialProvider $provider,
        #[CurrentUser] User $user,
        SocialAccountService $accounts,
        AppleIdentityVerifier $apple,
        GoogleIdentityVerifier $google,
    ): JsonResponse {
        if ($provider === SocialProvider::Apple) {
            $request = app(AppleLinkRequest::class);
            $accounts->link($user, $apple->verify($request->identityToken(), $request->nonce()), $request->authorizationCode());
        } else {
            $accounts->link($user, $google->verify(app(GoogleLinkRequest::class)->idToken()));
        }

        return response()->json(['user' => new MeResource($user)]);
    }

    /** Detaches the player's Apple or Google account, unless it is their last way in. */
    public function destroy(SocialProvider $provider, #[CurrentUser] User $user, SocialAccountService $accounts): JsonResponse
    {
        $accounts->unlink($user, $provider);

        return response()->json(['user' => new MeResource($user)]);
    }
}
