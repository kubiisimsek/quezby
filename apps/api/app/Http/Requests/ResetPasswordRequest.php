<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:191'],
            'code' => ['required', 'string', 'max:12'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ];
    }
}
