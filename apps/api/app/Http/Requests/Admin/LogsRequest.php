<?php

namespace App\Http\Requests\Admin;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use Illuminate\Validation\Rule;

class LogsRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'level' => ['nullable', Rule::enum(LogLevel::class)],
            'source' => ['nullable', Rule::enum(LogSource::class)],
            'event' => ['nullable', 'string', 'max:48'],
            'player' => ['nullable', 'ulid'],
            'status' => ['nullable', 'integer', 'min:100', 'max:999'],
        ];
    }
}
