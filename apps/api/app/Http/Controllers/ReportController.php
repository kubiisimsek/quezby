<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\ReportRequest;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Services\Social\ReportService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Response;

class ReportController extends Controller
{
    /**
     * Reports a player's photo or name for a moderator to look at. Always
     * `204`: the reporter is not told what becomes of it.
     */
    public function store(ReportRequest $request, string $username, #[CurrentUser] User $user, PlayerDirectory $players, ReportService $reports): Response
    {
        $reported = $players->named($username);
        if ($reported === null || $reported->is($user) || $reported->isBanned()) {
            throw ApiException::of(ErrorCode::NotFound);
        }
        $reports->report($user, $reported, $request->reason());

        return response()->noContent();
    }
}
