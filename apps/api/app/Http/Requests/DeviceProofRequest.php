<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * What every device check sends: the challenge from `POST /device/challenge`
 * it was made against. Only the envelope is checked here — whether the proof
 * reads, and what it is worth, is `DeviceIntegrity`'s to say.
 */
abstract class DeviceProofRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'challenge' => ['required', 'string', 'max:128'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'challenge' => 'doğrulama kodu',
            'token' => 'bütünlük jetonu',
            'keyId' => 'anahtar kimliği',
            'attestation' => 'cihaz onayı',
            'assertion' => 'cihaz imzası',
        ];
    }

    public function challenge(): string
    {
        return (string) $this->validated('challenge');
    }
}
