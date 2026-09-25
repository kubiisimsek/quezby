<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminRole;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PlayersRequest;
use App\Models\Admin;
use App\Models\User;
use App\Services\Admin\AdminPlayers;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * `GET /admin/players` and `/admin/players/{player}` — every account, banned
 * players and guests included.
 */
class PlayerController extends Controller
{
    public function __construct(
        private readonly AdminPlayers $players,
    ) {}

    public function index(PlayersRequest $request): JsonResponse
    {
        return response()->json($this->players->list(
            $request->safe()->only(['search', 'status', 'platform', 'sort']),
            $request->page(),
            $request->perPage(),
        ));
    }

    public function show(string $player, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $found = User::query()->find(strtolower($player)) ?? throw ApiException::of(ErrorCode::NotFound);

        return response()->json($this->players->detail($found, $admin->hasRole(AdminRole::Owner)));
    }
}
