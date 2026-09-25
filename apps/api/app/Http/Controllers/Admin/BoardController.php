<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BoardKeysRequest;
use App\Http\Requests\Admin\BoardRequest;
use App\Services\Admin\AdminBoards;
use Illuminate\Http\JsonResponse;

/** `GET /admin/boards` and `/admin/boards/keys` — any high-score board, any period, any season. */
class BoardController extends Controller
{
    public function __construct(
        private readonly AdminBoards $boards,
    ) {}

    public function index(BoardRequest $request): JsonResponse
    {
        $season = $request->validated('season');

        return response()->json($this->boards->board(
            $request->board(),
            $request->validated('key'),
            $season === null ? null : (int) $season,
            $request->page(),
            $request->perPage(),
        ));
    }

    public function keys(BoardKeysRequest $request): JsonResponse
    {
        $season = $request->validated('season');

        return response()->json($this->boards->keys(
            $request->board(),
            $season === null ? null : (int) $season,
            (int) ($request->validated('limit') ?? 30),
        ));
    }
}
