<?php

namespace App\Http\Requests\Admin;

use App\Enums\AuditAction;
use App\Enums\AuditVia;
use Illuminate\Validation\Rule;

class AuditRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'action' => ['nullable', Rule::enum(AuditAction::class)],
            'via' => ['nullable', Rule::enum(AuditVia::class)],
            'admin' => ['nullable', 'ulid'],
            'subjectType' => ['nullable', Rule::in(['player', 'run', 'admin', 'system'])],
            'subjectId' => ['nullable', 'string', 'max:26'],
        ];
    }
}
