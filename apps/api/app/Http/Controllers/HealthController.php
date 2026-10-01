<?php

namespace App\Http\Controllers;

use App\Support\Release;
use App\Support\Timestamp;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['status' => 'ok', 'version' => Release::version(), 'time' => Timestamp::iso(now())]);
    }
}
