<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RunStatus;
use App\Http\Controllers\Controller;
use App\Models\Run;
use Illuminate\Http\JsonResponse;

/** `GET /admin/counts` — what the panel's sidebar badges count. */
class CountsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['review' => Run::query()->where('status', RunStatus::Review)->count()]);
    }
}
