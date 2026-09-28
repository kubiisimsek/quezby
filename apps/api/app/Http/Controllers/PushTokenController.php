<?php

namespace App\Http\Controllers;

use App\Http\Requests\PushTokenRequest;
use App\Models\PushToken;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PushTokenController extends Controller
{
    /**
     * This phone takes the player's pushes. A token belongs to one account at
     * a time: a phone that signed in to another account brings it along. A
     * player keeps `push.tokens_per_player` phones; the longest unused goes.
     */
    public function store(PushTokenRequest $request, #[CurrentUser] User $user): Response
    {
        DB::transaction(function () use ($request, $user) {
            PushToken::query()->updateOrCreate(['token' => $request->token()], [
                'user_id' => $user->id,
                'platform' => $request->platform()->value,
                'app_version' => mb_substr((string) $request->header('X-App-Version', ''), 0, 32) ?: null,
            ]);
            $keep = (int) config('quezby.push.tokens_per_player');
            $stale = $user->pushTokens()->orderByDesc('updated_at')->orderByDesc('id')->skip($keep)->take(PHP_INT_MAX)->pluck('id');
            if ($stale->isNotEmpty()) {
                PushToken::query()->whereIn('id', $stale)->delete();
            }
        });

        return response()->noContent();
    }

    /** This phone takes no more of the player's pushes — before signing out. Idempotent. */
    public function destroy(PushTokenRequest $request, #[CurrentUser] User $user): Response
    {
        $user->pushTokens()->where('token', $request->token())->delete();

        return response()->noContent();
    }
}
