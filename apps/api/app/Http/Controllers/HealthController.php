<?php

namespace App\Http\Controllers;

use App\Support\Timestamp;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['status' => 'ok', 'time' => Timestamp::iso(now())]);
    }
}
