<?php

namespace App\Http\Requests;

/** `IosAttestationRequest` in `packages/types`. */
class IosAttestationRequest extends DeviceProofRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'keyId' => ['required', 'string', 'max:128'],
            'attestation' => ['required', 'string', 'max:65536'],
        ];
    }

    /** The new key's id, base64, as `DCAppAttestService.generateKey` returned it. */
    public function keyId(): string
    {
        return (string) $this->validated('keyId');
    }

    /** Base64 of App Attest's attestation object (CBOR). */
    public function attestation(): string
    {
        return (string) $this->validated('attestation');
    }
}
