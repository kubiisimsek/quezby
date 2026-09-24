<?php

namespace App\Http\Requests;

/** `AndroidIntegrityRequest` in `packages/types`. */
class AndroidIntegrityRequest extends DeviceProofRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'token' => ['required', 'string', 'max:32768'],
        ];
    }

    /** The Play Integrity token, requested with `requestHash = sha256Hex(challenge)`. */
    public function integrityToken(): string
    {
        return (string) $this->validated('token');
    }
}
