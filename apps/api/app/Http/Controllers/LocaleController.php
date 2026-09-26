<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateLocaleRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class LocaleController extends Controller
{
    /**
     * The language the player plays in, as the phone last set it. The API
     * answers in it whenever a request names none of the six
     * (`ResolveLocale`), and a phone signing in to the account takes it.
     */
    public function __invoke(UpdateLocaleRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        $user->forceFill(['locale' => $request->locale()])->save();

        return response()->json(['user' => new MeResource($user)]);
    }
}
