<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `AdminAnalyticsQuery`: the last 30 Istanbul days, or 90. */
class AnalyticsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'days' => ['nullable', 'integer', Rule::in([30, 90])],
        ];
    }

    public function days(): int
    {
        return (int) ($this->validated('days') ?? 30);
    }
}
