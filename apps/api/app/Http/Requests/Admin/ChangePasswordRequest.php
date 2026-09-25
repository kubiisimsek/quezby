<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'currentPassword' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255', Password::min(12), 'different:currentPassword'],
            'passwordConfirmation' => ['required', 'string', 'same:password'],
        ];
    }
}
