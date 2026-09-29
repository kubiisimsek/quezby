<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RatingBoardRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'scope' => ['nullable', Rule::in(['everyone', 'friends', 'league'])],
        ];
    }

    /** `everyone`; `friends`: the caller's friends, and the caller; `league`: the caller's own league. */
    public function scope(): string
    {
        return (string) ($this->validated('scope') ?? 'everyone');
    }
}
