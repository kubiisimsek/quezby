<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LinkCredentialsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:191'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ];
    }
}
