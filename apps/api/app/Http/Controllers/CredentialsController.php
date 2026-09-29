<?php

namespace App\Http\Controllers;

use App\Enums\EmailCodePurpose;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\CodeRequest;
use App\Http\Requests\LinkCredentialsRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\EmailCodes;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * An email and password attached to an account without an email — a guest,
 * or a player who signed in with Apple or Google — so it can sign in
 * elsewhere. The email counts only once proved: a code goes to it in the
 * account's language, and the password waits with it until then.
 */
class CredentialsController extends Controller
{
    public function store(LinkCredentialsRequest $request, #[CurrentUser] User $user, EmailCodes $codes): JsonResponse
    {
        if ($user->email !== null) {
            throw ApiException::of(ErrorCode::AlreadyLinked);
        }

        $email = Str::lower($request->validated('email'));
        if (User::query()->where('email', $email)->exists()) {
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        $row = $codes->issue(EmailCodePurpose::Link, $email, $user->locale, $user, [
            'password' => $request->validated('password'),
        ]);

        return $codes->response($email, $row);
    }

    /** A new code for the email waiting: `code_expired` when there is none. */
    public function resend(#[CurrentUser] User $user, EmailCodes $codes): JsonResponse
    {
        $row = $codes->find(EmailCodePurpose::Link, '', $user);
        if ($row === null) {
            throw ApiException::of(ErrorCode::CodeExpired);
        }

        return $codes->response($row->email, $codes->resend($row));
    }

    /** The right code attaches the email and its password. */
    public function verify(CodeRequest $request, #[CurrentUser] User $user, EmailCodes $codes): JsonResponse
    {
        $row = $codes->check($codes->find(EmailCodePurpose::Link, '', $user), $request->validated('code'));

        if ($user->email !== null) {
            $row->delete();
            throw ApiException::of(ErrorCode::AlreadyLinked);
        }
        if (User::query()->where('email', $row->email)->exists()) {
            $row->delete();
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        try {
            $user->forceFill(['email' => $row->email, 'password' => $row->password])->save();
        } catch (UniqueConstraintViolationException) {
            throw ApiException::of(ErrorCode::EmailTaken);
        } finally {
            $row->delete();
        }

        return response()->json(['user' => new MeResource($user)]);
    }
}
