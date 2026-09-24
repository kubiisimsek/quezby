<?php

namespace App\Http\Middleware;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Support\OpsToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the ops routes with `X-Ops-Token`. Without `OPS_TOKEN` configured the
 * routes do not exist at all.
 */
class VerifyOpsToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = OpsToken::current();
        if ($expected === '') {
            throw ApiException::of(ErrorCode::NotFound);
        }

        $given = $request->header('X-Ops-Token');
        if (! is_string($given) || ! hash_equals($expected, $given)) {
            throw ApiException::of(ErrorCode::Unauthenticated);
        }

        return $next($request);
    }
}
