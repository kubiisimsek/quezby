<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Analytics\Presence;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `presence`, on every player route: a token's first request of the day
 * puts the phone into the device registry and — with consent — marks the
 * player's day. Before the controller, so a deleted account takes today's
 * rows with it.
 */
class RecordPresence
{
    public function __construct(
        private readonly Presence $presence,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user instanceof User) {
            $this->presence->seen($request, $user);
        }

        return $next($request);
    }
}
