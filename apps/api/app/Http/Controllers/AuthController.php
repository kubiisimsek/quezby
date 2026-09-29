<?php

namespace App\Http\Controllers;

use App\Enums\EmailCodePurpose;
use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Exceptions\ApiException;
use App\Http\Requests\EmailRequest;
use App\Http\Requests\GuestSignUpRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\VerifyEmailRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\EmailCodes;
use App\Services\Identity\GuestNames;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * A new account with no email or password — the token is its only key —
     * playing as `guest48128742` until its player picks a name, in the
     * request's language. Two sign-ups that drew the same name at once: the
     * loser draws again.
     */
    public function guest(GuestSignUpRequest $request, GuestNames $names): JsonResponse
    {
        $create = fn () => User::create([
            'username' => $names->mint(),
            'platform' => $request->validated('platform'),
            'install_id' => $request->validated('installId'),
            'locale' => Locale::current(),
        ]);

        try {
            $user = $create();
        } catch (UniqueConstraintViolationException) {
            $user = $create();
        }

        return response()->json([
            'token' => $user->createToken($user->platform ?? 'app')->plainTextToken,
            'user' => new MeResource($user),
        ], 201);
    }

    /**
     * The first half of an email sign-up: nothing is made until the email is
     * proved. The password waits with a six-digit code sent in the request's
     * language (`EmailCodes`); calling again while the code is fresh keeps it
     * and sends nothing. An email an account holds is `email_taken`.
     */
    public function register(RegisterRequest $request, EmailCodes $codes): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        if (User::query()->where('email', $email)->exists()) {
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        $row = $codes->issue(EmailCodePurpose::Signup, $email, Locale::current(), attributes: [
            'password' => $request->validated('password'),
            'platform' => $request->validated('platform'),
            'install_id' => $request->validated('installId'),
        ]);

        return $codes->response($email, $row);
    }

    /** A new code for a sign-up still waiting: `code_expired` when there is none. */
    public function resendRegistration(EmailRequest $request, EmailCodes $codes): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $row = $codes->find(EmailCodePurpose::Signup, $email);
        if ($row === null) {
            throw ApiException::of(ErrorCode::CodeExpired);
        }

        return $codes->response($email, $codes->resend($row));
    }

    /**
     * The second half: the right code makes the account — named like a guest
     * until its player picks a name, never a guest, in the language it signed
     * up in — and signs it in. Accounts are never merged: an email another
     * account took in between is `email_taken`.
     */
    public function verifyRegistration(VerifyEmailRequest $request, EmailCodes $codes, GuestNames $names): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $row = $codes->check($codes->find(EmailCodePurpose::Signup, $email), $request->validated('code'));

        if (User::query()->where('email', $email)->exists()) {
            $row->delete();
            throw ApiException::of(ErrorCode::EmailTaken);
        }

        $create = fn () => User::create([
            'username' => $names->mint(),
            'email' => $email,
            'password' => $row->password,
            'platform' => $row->platform,
            'install_id' => $row->install_id,
            'locale' => $row->locale,
        ]);

        try {
            $user = $create();
        } catch (UniqueConstraintViolationException) {
            // Two sign-ups at once: either the email (refused) or the drawn name (drawn again).
            if (User::query()->where('email', $email)->exists()) {
                $row->delete();
                throw ApiException::of(ErrorCode::EmailTaken);
            }
            $user = $create();
        }
        $row->delete();

        return response()->json([
            'token' => $user->createToken($user->platform ?? 'app')->plainTextToken,
            'user' => new MeResource($user),
        ], 201);
    }

    /**
     * Only accounts that linked an email can sign in this way. An email
     * sign-up never verified, with its own password, gets a new code and
     * `email_unverified`, so the app can ask for it.
     */
    public function login(LoginRequest $request, EmailCodes $codes): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $password = $request->validated('password');
        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $waiting = $codes->find(EmailCodePurpose::Signup, $email);
            if ($waiting?->password !== null && Hash::check($password, $waiting->password)) {
                $codes->resend($waiting);
                throw ApiException::of(ErrorCode::EmailUnverified);
            }
        }

        if ($user === null || $user->password === null || ! Hash::check($password, $user->password)) {
            throw ApiException::of(ErrorCode::InvalidCredentials);
        }

        return response()->json([
            'token' => $user->createToken('login')->plainTextToken,
            'user' => new MeResource($user),
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
