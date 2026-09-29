<?php

namespace App\Http\Controllers;

use App\Enums\EmailCodePurpose;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Requests\EmailRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\Identity\EmailCodes;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PasswordController extends Controller
{
    /**
     * A forgotten password: a code to the account's email, in the account's
     * language. The answer is the same whether an account has that email or
     * not, so the form tells no one who plays. Calling again sends a new
     * code once the last is a minute old.
     */
    public function forgot(EmailRequest $request, EmailCodes $codes): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $user = User::query()->where('email', $email)->first();
        if ($user === null) {
            return $codes->response($email, null);
        }

        $row = $codes->find(EmailCodePurpose::Reset, $email);
        $row = $row !== null && ! $row->isExpired()
            ? $codes->resend($row)
            : $codes->issue(EmailCodePurpose::Reset, $email, $user->locale, $user);

        return $codes->response($email, $row);
    }

    /**
     * The right code sets the new password, signs every phone out and this
     * one in.
     */
    public function reset(ResetPasswordRequest $request, EmailCodes $codes): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $row = $codes->check($codes->find(EmailCodePurpose::Reset, $email), $request->validated('code'));
        $user = User::query()->find($row->user_id);
        if ($user === null || $user->email !== $email) {
            $row->delete();
            throw ApiException::of(ErrorCode::CodeExpired);
        }

        $token = DB::transaction(function () use ($row, $user, $request) {
            $row->delete();
            $user->forceFill(['password' => $request->validated('password')])->save();
            $user->tokens()->delete();

            return $user->createToken('reset')->plainTextToken;
        });

        return response()->json(['token' => $token, 'user' => new MeResource($user)]);
    }
}
