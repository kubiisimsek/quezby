<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Social\NotificationService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    /** `NotificationsResponse`: the bell's list, the newest fifty. */
    public function index(#[CurrentUser] User $user): JsonResponse
    {
        return response()->json($this->notifications->list($user));
    }

    /** The player opened the list: everything in it so far is seen, on every phone. */
    public function seen(#[CurrentUser] User $user): Response
    {
        $this->notifications->markSeen($user);

        return response()->noContent();
    }
}
