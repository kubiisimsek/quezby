<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeletePlayerRequest;
use App\Http\Requests\Admin\ReasonRequest;
use App\Models\Admin;
use App\Models\User;
use App\Services\Admin\PlayerActions;
use App\Services\ModerationService;
use App\Services\Social\ReportService;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * What a moderator (and, for deleting, an owner) does to a player from the
 * panel. Each answers `{ changed }` — false when there was nothing to do.
 */
class PlayerActionController extends Controller
{
    public function __construct(
        private readonly ModerationService $moderation,
        private readonly PlayerActions $actions,
    ) {}

    public function ban(ReasonRequest $request, string $player, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['changed' => $this->moderation->ban($this->player($player), $request->reason(), Actor::panel($admin, $request))]);
    }

    public function unban(Request $request, string $player, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['changed' => $this->moderation->unban($this->player($player), Actor::panel($admin, $request))]);
    }

    public function rename(ReasonRequest $request, string $player, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $name = $this->actions->rename($this->player($player), $request->reason(), Actor::panel($admin, $request));

        return response()->json(['changed' => true, 'username' => $name]);
    }

    /** Takes a player's photo down; their photo reports close. */
    public function removeAvatar(ReasonRequest $request, string $player, #[CurrentUser('admin')] Admin $admin, ReportService $reports): JsonResponse
    {
        return response()->json(['changed' => $reports->removeAvatar($this->player($player), $request->reason(), Actor::panel($admin, $request))]);
    }

    /** Lets a player's open reports go. */
    public function dismissReports(ReasonRequest $request, string $player, #[CurrentUser('admin')] Admin $admin, ReportService $reports): JsonResponse
    {
        return response()->json(['changed' => $reports->dismiss($this->player($player), $request->reason(), Actor::panel($admin, $request)) > 0]);
    }

    public function signOut(Request $request, string $player, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['changed' => $this->actions->signOut($this->player($player), Actor::panel($admin, $request)) > 0]);
    }

    public function destroy(DeletePlayerRequest $request, string $player, #[CurrentUser('admin')] Admin $admin): Response
    {
        $found = $this->player($player);
        if ($found->username === null || $request->validated('confirm') !== $found->username) {
            throw ValidationException::withMessages(['confirm' => 'Onaylamak için oyuncunun adını olduğu gibi yaz.']);
        }

        $this->actions->delete($found, $request->reason(), Actor::panel($admin, $request));

        return response()->noContent();
    }

    private function player(string $id): User
    {
        return User::query()->find(strtolower($id)) ?? throw ApiException::of(ErrorCode::NotFound);
    }
}
