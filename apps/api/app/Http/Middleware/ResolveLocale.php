<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * `locale`, on every player route: the language the API answers in — its
 * messages, validation lines and share texts. The first of the six that
 * `Accept-Language` names (the app sends its own); else the signed-in
 * player's (`users.locale`); else Turkish, the configured default. It runs
 * before `auth:sanctum` and the throttles (`bootstrap/app.php` puts it
 * ahead of them), so a 401 or a 429 speaks it too. The ops routes and the
 * admin panel never pass here: they stay Turkish.
 *
 * The app's language is put back afterwards, so nothing that comes after
 * the request in the same process — the next test, a queued job — inherits it.
 */
class ResolveLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $previous = App::getLocale();
        App::setLocale($this->localeOf($request)->value);

        try {
            return $next($request);
        } finally {
            App::setLocale($previous);
        }
    }

    /**
     * Only a request that names none of the six asks who is signing in: the
     * sanctum guard (the default one is `web`), whose user `auth:sanctum` then
     * takes as it is.
     */
    private function localeOf(Request $request): Locale
    {
        $locale = Locale::fromHeader($request);
        if ($locale !== null) {
            return $locale;
        }

        $user = $request->user('sanctum');
        if ($user instanceof User) {
            return $user->locale;
        }

        return Locale::tryFrom((string) config('app.locale')) ?? Locale::Tr;
    }
}
