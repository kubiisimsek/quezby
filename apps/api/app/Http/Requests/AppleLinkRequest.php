<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `AppleLinkRequest` in `packages/types`. */
class AppleLinkRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identityToken' => ['required', 'string', 'max:4096'],
            'nonce' => ['required', 'string', 'max:128'],
            'authorizationCode' => ['nullable', 'string', 'max:1024'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'identityToken' => 'kimlik jetonu',
            'nonce' => 'tek kullanımlık kod',
            'authorizationCode' => 'yetki kodu',
        ];
    }

    public function identityToken(): string
    {
        return (string) $this->validated('identityToken');
    }

    /** The raw nonce from `POST /auth/nonce`; the token carries its SHA-256. */
    public function nonce(): string
    {
        return (string) $this->validated('nonce');
    }

    public function authorizationCode(): ?string
    {
        $code = $this->validated('authorizationCode');

        return is_string($code) && $code !== '' ? $code : null;
    }
}
