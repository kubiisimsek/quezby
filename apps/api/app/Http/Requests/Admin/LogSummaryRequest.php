<?php

namespace App\Http\Requests\Admin;

use App\Services\Admin\AdminLogs;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `range`: `30d` — a bar a day for thirty days (the default) — or `12m`, a bar a month for twelve. */
class LogSummaryRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return ['range' => ['nullable', Rule::in(AdminLogs::RANGES)]];
    }

    public function range(): string
    {
        return (string) ($this->validated('range') ?? '30d');
    }
}
