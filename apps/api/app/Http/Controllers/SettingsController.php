<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    public function __invoke(UpdateSettingsRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $user->forceFill([
            'settings' => array_merge($user->resolvedSettings(), $request->validated()),
        ])->save();

        return response()->json(['settings' => $user->resolvedSettings()]);
    }
}
