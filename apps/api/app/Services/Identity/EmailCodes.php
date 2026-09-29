<?php

namespace App\Services\Identity;

use App\Enums\EmailCodePurpose;
use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Exceptions\ApiException;
use App\Mail\EmailCodeMail;
use App\Models\EmailCode;
use App\Models\User;
use App\Support\Timestamp;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

/**
 * Six-digit codes that prove an email: sent in the row's language, kept only
 * as an HMAC, good for `ttl_minutes`, a new one no sooner than
 * `resend_seconds` after the last, and gone after `max_attempts` wrong tries.
 * A sign-up's and a reset's row is found by its email, a link's by its player.
 */
final class EmailCodes
{
    /**
     * A code for a new row — or, while the last code is still fresh, the row
     * as it is with `$attributes` written over it (a new password), and no
     * second email.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function issue(EmailCodePurpose $purpose, string $email, Locale $locale, ?User $user = null, array $attributes = []): EmailCode
    {
        EmailCode::query()->where('expires_at', '<', now()->subDay())->delete();

        $row = $this->find($purpose, $email, $user);
        if ($row !== null && $row->email === $email && ! $row->isExpired() && $this->resendIn($row) > 0) {
            $row->fill($attributes)->save();

            return $row;
        }
        $row?->delete();

        return $this->deliver(new EmailCode([
            ...$attributes,
            'purpose' => $purpose,
            'email' => $email,
            'user_id' => $user?->id,
            'locale' => $locale,
        ]));
    }

    /** A new code for a row that already has one — not sooner than the wait. */
    public function resend(EmailCode $row): EmailCode
    {
        return $this->resendIn($row) > 0 ? $row : $this->deliver($row);
    }

    /** A sign-up's or a reset's row by its email; a link's by its player. */
    public function find(EmailCodePurpose $purpose, string $email, ?User $user = null): ?EmailCode
    {
        $query = EmailCode::query()->where('purpose', $purpose);

        return ($purpose === EmailCodePurpose::Link
            ? $query->where('user_id', $user?->id)
            : $query->where('email', $email)
        )->latest('id')->first();
    }

    /**
     * The row, once `$code` is its code. An expired or missing one is
     * `code_expired`; a wrong one `code_invalid`, and the last wrong try
     * expires it — a new one can still be sent. The caller deletes the row
     * once it has used it.
     */
    public function check(?EmailCode $row, string $code): EmailCode
    {
        if ($row === null || $row->isExpired()) {
            throw ApiException::of(ErrorCode::CodeExpired);
        }
        if (! hash_equals($row->code, $this->hash(preg_replace('/\s+/', '', $code) ?? ''))) {
            $row->increment('attempts');
            if ($row->attempts >= (int) config('quezby.email_codes.max_attempts')) {
                // Used up, not gone: a new code may still be asked for.
                $row->forceFill(['expires_at' => now()])->save();
                throw ApiException::of(ErrorCode::CodeExpired);
            }
            throw ApiException::of(ErrorCode::CodeInvalid);
        }

        return $row;
    }

    /** `CodeSentResponse`: 202, where the code went, when a new one may be asked for, when this one ends. */
    public function response(string $email, ?EmailCode $row): JsonResponse
    {
        return response()->json([
            'email' => $email,
            'resendIn' => $row === null ? (int) config('quezby.email_codes.resend_seconds') : $this->resendIn($row),
            'expiresAt' => Timestamp::iso($row?->expires_at ?? now()->addMinutes((int) config('quezby.email_codes.ttl_minutes'))),
        ], 202);
    }

    /** Seconds before a new code may go out. */
    private function resendIn(EmailCode $row): int
    {
        $wait = (int) config('quezby.email_codes.resend_seconds');

        return max(0, $wait - (int) floor($row->sent_at->diffInSeconds(now())));
    }

    /** Draws a code, emails it in the row's language, then keeps its HMAC: a mail that failed keeps nothing new. */
    private function deliver(EmailCode $row): EmailCode
    {
        $minutes = (int) config('quezby.email_codes.ttl_minutes');
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        Mail::to($row->email)->locale($row->locale->value)->send(new EmailCodeMail($row->purpose, $code, $minutes));

        $row->forceFill([
            'code' => $this->hash($code),
            'attempts' => 0,
            'sent_at' => now(),
            'expires_at' => now()->addMinutes($minutes),
        ])->save();

        return $row;
    }

    private function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
