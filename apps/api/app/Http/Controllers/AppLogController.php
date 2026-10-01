<?php

namespace App\Http\Controllers;

use App\Enums\LogSource;
use App\Http\Requests\AppLogRequest;
use App\Services\Logs\SystemLogger;
use Illuminate\Http\Response;

/**
 * `POST /me/logs` — errors the phone swallowed (a push token Firebase would
 * not give, a request that never reached the API, a crash), as rows of the
 * panel's Loglar page with source `app`, under the player who sent them.
 */
class AppLogController extends Controller
{
    public function __invoke(AppLogRequest $request, SystemLogger $logger): Response
    {
        $device = SystemLogger::device($request);
        foreach ($request->entries() as $entry) {
            $logger->write($entry['level'], LogSource::App, $entry['event'], $entry['message'], [
                ...$device,
                'context' => array_filter([...$entry['context'], 'phoneAt' => $entry['at']], fn ($value) => $value !== null),
            ]);
        }

        return response()->noContent();
    }
}
