<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `GoogleLinkRequest` in `packages/types`. */
class GoogleLinkRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'idToken' => ['required', 'string', 'max:4096'],
        ];
    }

    public function idToken(): string
    {
        return (string) $this->validated('idToken');
    }
}
