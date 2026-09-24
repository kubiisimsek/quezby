<?php

namespace App\Http\Controllers;

use App\Http\Requests\AndroidIntegrityRequest;
use App\Http\Requests\IosAssertionRequest;
use App\Http\Requests\IosAttestationRequest;
use App\Models\User;
use App\Services\Integrity\DeviceChallenges;
use App\Services\Integrity\DeviceIntegrity;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * The phone vouching for itself — Play Integrity on Android, App Attest on
 * iOS — against a one-time challenge. The verdict decides whether this
 * device's runs can rank; see `DeviceIntegrity`.
 */
class DeviceController extends Controller
{
    public function __construct(
        private readonly DeviceIntegrity $integrity,
    ) {}

    /** `DeviceChallengeResponse`: single use, for this player, for five minutes. */
    public function challenge(#[CurrentUser] User $user, DeviceChallenges $challenges): JsonResponse
    {
        ['challenge' => $challenge, 'expiresAt' => $expiresAt] = $challenges->issue($user);

        return response()->json(['challenge' => $challenge, 'expiresAt' => Timestamp::iso($expiresAt)], 201);
    }

    public function android(AndroidIntegrityRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json(
            $this->integrity->android($user, $request->challenge(), $request->integrityToken())->toArray(),
        );
    }

    public function iosAttest(IosAttestationRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json(
            $this->integrity->attest($user, $request->challenge(), $request->keyId(), $request->attestation())->toArray(),
        );
    }

    public function iosAssert(IosAssertionRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json(
            $this->integrity->assert($user, $request->challenge(), $request->keyId(), $request->assertion())->toArray(),
        );
    }
}
