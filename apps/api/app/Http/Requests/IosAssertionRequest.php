<?php

namespace App\Http\Requests;

/** `IosAssertionRequest` in `packages/types`. */
class IosAssertionRequest extends DeviceProofRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'keyId' => ['required', 'string', 'max:128'],
            'assertion' => ['required', 'string', 'max:8192'],
        ];
    }

    /** The attested key's id, base64. */
    public function keyId(): string
    {
        return (string) $this->validated('keyId');
    }

    /** Base64 of App Attest's assertion (CBOR). */
    public function assertion(): string
    {
        return (string) $this->validated('assertion');
    }
}
