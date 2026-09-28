<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\Duel;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Services\Social\DuelService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

class DuelController extends Controller
{
    public function __construct(
        private readonly DuelService $duels,
        private readonly PlayerDirectory $players,
    ) {}

    /** `DuelResponse`: a VS as one of its two players sees it now. */
    public function show(string $duel, #[CurrentUser] User $user): JsonResponse
    {
        $found = Duel::query()->find($duel);
        if ($found === null || ! $found->involves($user) || ! $this->duels->shows($found, $user)) {
            throw ApiException::of(ErrorCode::NotFound);
        }

        return response()->json(['duel' => $this->present($user, $this->duels->settle($found))]);
    }

    /** The friend turns a VS down — `DuelResponse`. */
    public function decline(string $duel, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json(['duel' => $this->present($user, $this->duels->decline($user, $duel))]);
    }

    /** @return array<string, mixed> */
    private function present(User $user, Duel $duel): array
    {
        $other = User::query()->findOrFail($duel->otherOf($user));

        return $this->duels->view($user, $duel, $this->players->summary($user, $other));
    }
}
