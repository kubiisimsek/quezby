<?php

namespace App\Http\Requests;

use App\Enums\Platform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `AnalyticsVisitsRequest` in `packages/types`: the limits of
 * `config/quezby.php` › `analytics.limits`, so no phone can send more than
 * its share. Codes are not checked here: one this API does not know yet is
 * dropped and counted, not refused (`VisitIngest`).
 */
class AnalyticsVisitsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $limits = config('quezby.analytics.limits');

        return [
            'sentAt' => ['required', 'string', 'date'],
            'platform' => ['required', 'string', Rule::enum(Platform::class)],
            'visits' => ['required', 'array', 'list', 'min:1', 'max:'.$limits['visits_per_batch']],
            'visits.*' => ['array'],
            'visits.*.id' => ['required', 'string', 'regex:/^[0-9a-f]{32}$/'],
            'visits.*.startedAt' => ['required', 'string', 'date'],
            'visits.*.seconds' => ['required', 'integer', 'min:0', 'max:86400'],
            'visits.*.appVersion' => ['nullable', 'string', 'max:32'],
            'visits.*.journey' => ['present', 'array', 'list', 'max:'.$limits['journey_steps']],
            'visits.*.journey.*' => ['array', 'list', 'size:2'],
            'visits.*.journey.*.0' => ['required', 'string', 'max:32'],
            'visits.*.journey.*.1' => ['required', 'integer', 'min:0', 'max:86400'],
            'visits.*.counts' => ['present', 'array', 'max:64'],
            'visits.*.counts.*' => ['integer', 'min:0', 'max:'.$limits['max_count']],
        ];
    }

    /**
     * @return array{sentAt: string, platform: string, visits: list<array{id: string, startedAt: string, seconds: int, appVersion?: string|null, journey: list<array{0: string, 1: int}>, counts: array<string, int>}>}
     */
    public function batch(): array
    {
        /** @var array{sentAt: string, platform: string, visits: list<array{id: string, startedAt: string, seconds: int, appVersion?: string|null, journey: list<array{0: string, 1: int}>, counts: array<string, int>}>} $batch */
        $batch = $this->validated();

        return $batch;
    }
}
