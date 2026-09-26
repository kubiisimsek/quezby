<?php

namespace App\Http\Middleware;

use App\Support\AppKey;
use Closure;
use Illuminate\Encryption\MissingAppKeyException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * No player request without `APP_KEY`: checkpoint receipts are signed with it
 * and Apple's refresh tokens encrypted with it, so without one every ranked
 * run would come back "Makbuz eksik" and Apple sign-in would fail after its
 * one-time code was spent. The request stops here, as a logged 500. The
 * admin panel and the ops routes stay open: they need no key, and they are
 * how a missing one is put right — "Önbelleği yenile" once `.env` has it.
 */
class RequireAppKey
{
    /** @var list<string> */
    private const OPEN = ['api/v1/admin', 'api/v1/admin/*', 'api/v1/ops/*'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is(...self::OPEN) && ($problem = AppKey::problem()) !== null) {
            throw new MissingAppKeyException(sprintf(
                'APP_KEY is %s: put the line `php artisan key:generate --show` prints in .env, then rebuild the configuration cache (admin panel → Sistem → Önbelleği yenile).',
                $problem,
            ));
        }

        return $next($request);
    }
}
