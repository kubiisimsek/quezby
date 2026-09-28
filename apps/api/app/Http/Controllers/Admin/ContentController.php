<?php

namespace App\Http\Controllers\Admin;

use App\Game\ReelKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ContentRequest;
use App\Services\Admin\ContentStats;
use Illuminate\Http\JsonResponse;

/** `GET /admin/content` — how each post of the feed fares, a page at a time. */
class ContentController extends Controller
{
    public function __invoke(ContentRequest $request, ContentStats $content): JsonResponse
    {
        $kind = $request->validated('kind');

        return response()->json($content->list(
            $kind === null ? null : ReelKind::from((string) $kind),
            (string) ($request->validated('sort') ?? 'shows'),
            $request->page(),
            $request->perPage(),
        ));
    }
}
