<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppConfigRequest;
use App\Support\AppVersion;
use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    public function __invoke(AppConfigRequest $request): JsonResponse
    {
        $app = config('quezby.apps.'.$request->platform()->value);
        $minVersion = (string) $app['min_version'];
        $latestVersion = (string) $app['latest_version'];

        return response()->json([
            'status' => AppVersion::status($request->validated('version'), $minVersion, $latestVersion)->value,
            'engineVersion' => config('quezby.engine_version'),
            'contentVersion' => config('quezby.content_version'),
            'latestVersion' => $latestVersion,
            'minVersion' => $minVersion,
            'storeUrl' => filled($app['store_url']) ? (string) $app['store_url'] : null,
        ]);
    }
}
