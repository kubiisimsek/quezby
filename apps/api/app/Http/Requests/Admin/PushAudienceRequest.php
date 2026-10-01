<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Enums\Platform;
use App\Services\Push\PushAudience;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `AdminPushFilters` in `packages/types`, under `filters` — who a push from the panel goes to. */
class PushAudienceRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'filters' => ['present', 'array:username,tiers,daily,playedWithinDays,notPlayedForDays,joinedWithinDays,platform,locales,account'],
            'filters.username' => ['nullable', 'string', 'max:32'],
            'filters.tiers' => ['nullable', 'array'],
            'filters.tiers.*' => [Rule::in(PushAudience::TIERS)],
            'filters.daily' => ['nullable', Rule::in(['played', 'not_played'])],
            'filters.playedWithinDays' => ['nullable', 'integer', 'min:1', 'max:365'],
            'filters.notPlayedForDays' => ['nullable', 'integer', 'min:1', 'max:365'],
            'filters.joinedWithinDays' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'filters.platform' => ['nullable', Rule::enum(Platform::class)],
            'filters.locales' => ['nullable', 'array'],
            'filters.locales.*' => [Rule::enum(Locale::class)],
            'filters.account' => ['nullable', Rule::in(['guest', 'registered'])],
        ];
    }

    /**
     * The filters given, without the empty ones.
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return array_filter((array) $this->validated('filters'), fn ($value) => $value !== null && $value !== '' && $value !== []);
    }
}
