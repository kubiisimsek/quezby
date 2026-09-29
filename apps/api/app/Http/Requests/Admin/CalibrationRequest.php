<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CalibrationRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ];
    }

    public function days(): int
    {
        return (int) ($this->validated('days') ?? 30);
    }
}
