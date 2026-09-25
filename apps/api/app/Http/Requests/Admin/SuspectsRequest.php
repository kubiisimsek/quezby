<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class SuspectsRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'days' => ['nullable', 'integer', Rule::in([7, 30])],
            'includeBanned' => ['nullable', 'boolean'],
        ];
    }

    public function days(): int
    {
        return (int) ($this->validated('days') ?? 30);
    }

    public function includeBanned(): bool
    {
        return (bool) ($this->validated('includeBanned') ?? false);
    }
}
