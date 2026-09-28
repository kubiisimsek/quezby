<?php

namespace App\Http\Requests;

use App\Enums\Platform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `PushTokenRequest` in `packages/types`: a phone's Firebase Cloud Messaging token, and which kind of phone. */
class PushTokenRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'min:20', 'max:255', 'regex:/^[A-Za-z0-9:_\-.]+$/'],
            'platform' => [$this->isMethod('DELETE') ? 'nullable' : 'required', Rule::enum(Platform::class)],
        ];
    }

    public function token(): string
    {
        return (string) $this->validated('token');
    }

    public function platform(): Platform
    {
        return Platform::from((string) $this->validated('platform'));
    }
}
