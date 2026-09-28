<?php

namespace App\Http\Requests\Admin;

use App\Enums\LeaderboardPeriod;
use Closure;
use Illuminate\Validation\Rule;

class BoardRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'board' => ['required', Rule::in(LeaderboardPeriod::boardValues())],
            'key' => ['nullable', 'string', 'max:10', $this->keyFitsBoard()],
            'season' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function board(): LeaderboardPeriod
    {
        return LeaderboardPeriod::from((string) $this->validated('board'));
    }

    /** `2026-09-24` for a challenge day, `2026-W39` for a week, `2026-09` for a month, `all` for all time. */
    protected function keyFitsBoard(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            $pattern = match ($this->input('board')) {
                'challenge' => '/^\d{4}-\d{2}-\d{2}$/',
                'weekly' => '/^\d{4}-W\d{2}$/',
                'monthly' => '/^\d{4}-\d{2}$/',
                'all' => '/^all$/',
                default => null,
            };
            if ($pattern !== null && preg_match($pattern, (string) $value) !== 1) {
                $fail('Dönem bu tabloya uymuyor.');
            }
        };
    }
}
