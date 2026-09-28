<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\CursorRequest;
use App\Http\Requests\SendPhraseRequest;
use App\Http\Requests\ThreadRequest;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Services\Social\InboxService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class InboxController extends Controller
{
    public function __construct(
        private readonly InboxService $inbox,
        private readonly PlayerDirectory $players,
    ) {}

    /** `InboxSummary`: what the badges count. */
    public function summary(#[CurrentUser] User $user): JsonResponse
    {
        return response()->json($this->inbox->summary($user));
    }

    /** `Pulse`: the number that moves with the inbox, asked every few seconds. */
    public function pulse(#[CurrentUser] User $user): JsonResponse
    {
        return response()->json(['stamp' => $this->inbox->pulse($user)]);
    }

    /** `FriendsResponse`: the friends, the one last heard from first. */
    public function friends(CursorRequest $request, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json($this->inbox->friends($user, $request->cursor()));
    }

    /** `ThreadResponse`: the conversation with a friend, a page at a time. */
    public function thread(ThreadRequest $request, string $username, #[CurrentUser] User $user): JsonResponse
    {
        return response()->json($this->inbox->thread($user, $this->player($username, $user), $request->before()));
    }

    public function read(string $username, #[CurrentUser] User $user): Response
    {
        $this->inbox->read($user, $this->player($username, $user));

        return response()->noContent();
    }

    /** `SendPhraseResponse`: the line as it now stands in the conversation. */
    public function send(SendPhraseRequest $request, string $username, #[CurrentUser] User $user): JsonResponse
    {
        $message = $this->inbox->sendPhrase($user, $this->player($username, $user), $request->phrase());

        return response()->json(['message' => $this->inbox->present($user, $message)], 201);
    }

    private function player(string $username, User $user): User
    {
        return $this->players->find($username, $user) ?? throw ApiException::of(ErrorCode::NotFound);
    }
}
