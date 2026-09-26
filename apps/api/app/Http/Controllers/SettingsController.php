<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\User;
use App\Services\Analytics\Consent;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;

class SettingsController extends Controller
{
    /**
     * `analytics` is the player's consent, kept as its moment by `Consent`
     * (a no deletes what was kept about them); the rest goes in `settings`.
     */
    public function __invoke(UpdateSettingsRequest $request, #[CurrentUser] User $user, Consent $consent): JsonResponse
    {
        $changes = $request->validated();

        if (array_key_exists('analytics', $changes)) {
            $changes['analytics']
                ? $consent->grant($user, $request->header('X-App-Version'))
                : $consent->revoke($user);
            unset($changes['analytics']);
        }

        if ($changes !== []) {
            $user->forceFill([
                'settings' => array_merge(Arr::except($user->resolvedSettings(), ['analytics']), $changes),
            ])->save();
        }

        return response()->json(['settings' => $user->resolvedSettings()]);
    }
}
