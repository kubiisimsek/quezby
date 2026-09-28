<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReportStatus;
use Illuminate\Validation\Rule;

class ReportsRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'status' => ['nullable', Rule::enum(ReportStatus::class)],
        ];
    }

    public function status(): ReportStatus
    {
        return ReportStatus::from((string) ($this->validated('status') ?? ReportStatus::Open->value));
    }
}
