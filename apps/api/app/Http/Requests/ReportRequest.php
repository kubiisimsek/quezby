<?php

namespace App\Http\Requests;

use App\Enums\ReportReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `ReportRequest` in `packages/types`: what about the player — their photo or their name. */
class ReportRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', Rule::enum(ReportReason::class)],
        ];
    }

    public function reason(): ReportReason
    {
        return ReportReason::from((string) $this->validated('reason'));
    }
}
