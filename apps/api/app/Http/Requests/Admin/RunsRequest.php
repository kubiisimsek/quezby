<?php

namespace App\Http\Requests\Admin;

use App\Enums\RunFlag;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use Illuminate\Validation\Rule;

class RunsRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'status' => ['nullable', Rule::enum(RunStatus::class)],
            'mode' => ['nullable', Rule::enum(RunMode::class)],
            'flag' => ['nullable', Rule::enum(RunFlag::class)],
            'player' => ['nullable', 'ulid'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'sort' => ['nullable', Rule::in(['newest', 'score'])],
        ];
    }
}
