<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckUsernameRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'username' => ['nullable', 'string'],
        ];
    }

    /** The name as typed. Untrimmed: the username rules trim it the way the app does. */
    public function username(): string
    {
        return (string) $this->validated('username');
    }
}
