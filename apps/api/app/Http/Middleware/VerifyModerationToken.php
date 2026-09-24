<?php

namespace App\Http\Middleware;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Support\ModerationToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards `POST /ops/moderate` with `X-Moderation-Token`. Without
 * `MODERATION_TOKEN` configured the route does not exist at all.
 */
class VerifyModerationToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = ModerationToken::current();
        if ($expected === '') {
            throw ApiException::of(ErrorCode::NotFound);
        }

        $given = $request->header('X-Moderation-Token');
        if (! is_string($given) || ! hash_equals($expected, $given)) {
            throw ApiException::of(ErrorCode::Unauthenticated);
        }

        return $next($request);
    }
}
