<?php

namespace App\Http\Requests;

use App\Enums\Platform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AppConfigRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', Rule::enum(Platform::class)],
            'version' => ['nullable', 'string', 'max:64'],
        ];
    }

    public function platform(): Platform
    {
        return Platform::from($this->validated('platform'));
    }
}
