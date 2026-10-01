<?php

namespace App\Http\Controllers;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Http\Requests\PushTokenRequest;
use App\Models\PushToken;
use App\Models\User;
use App\Services\Logs\SystemLogger;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PushTokenController extends Controller
{
    /**
     * This phone takes the player's pushes. A token belongs to one account at
     * a time: a phone that signed in to another account brings it along. A
     * player keeps `push.tokens_per_player` phones; the longest unused goes.
     * The Loglar page says so (`push.registered`) when something changed —
     * a new phone, a phone that moved to this account, a new platform or app
     * version — and not on every launch that sends the same token again:
     * whether a phone ever got this far is the first question when a push
     * does not arrive.
     */
    public function store(PushTokenRequest $request, #[CurrentUser] User $user, SystemLogger $logger): Response
    {
        $row = DB::transaction(function () use ($request, $user) {
            $row = PushToken::query()->updateOrCreate(['token' => $request->token()], [
                'user_id' => $user->id,
                'platform' => $request->platform()->value,
                'app_version' => mb_substr((string) $request->header('X-App-Version', ''), 0, 32) ?: null,
            ]);
            $keep = (int) config('quezby.push.tokens_per_player');
            $stale = $user->pushTokens()->orderByDesc('updated_at')->orderByDesc('id')->skip($keep)->take(PHP_INT_MAX)->pluck('id');
            if ($stale->isNotEmpty()) {
                PushToken::query()->whereIn('id', $stale)->delete();
            }

            return $row;
        });

        $change = match (true) {
            $row->wasRecentlyCreated => ['new', 'Telefon bildirim cihazı olarak kaydedildi.'],
            $row->wasChanged('user_id') => ['account', 'Telefon bu hesaba geçti; bildirimleri artık bu hesap alır.'],
            $row->wasChanged('platform') => ['platform', 'Cihazın platformu değişti.'],
            $row->wasChanged('app_version') => ['version', 'Cihazın uygulama sürümü değişti.'],
            default => null,
        };
        if ($change !== null) {
            $logger->write(LogLevel::Info, LogSource::Push, 'push.registered', $change[1], [
                ...SystemLogger::device($request),
                'platform' => $request->platform()->value,
                'appVersion' => $row->app_version,
                'context' => ['change' => $change[0], 'device' => '…'.substr($request->token(), -8)],
            ]);
        }

        return response()->noContent();
    }

    /** This phone takes no more of the player's pushes — before signing out. Idempotent. */
    public function destroy(PushTokenRequest $request, #[CurrentUser] User $user): Response
    {
        $user->pushTokens()->where('token', $request->token())->delete();

        return response()->noContent();
    }
}
