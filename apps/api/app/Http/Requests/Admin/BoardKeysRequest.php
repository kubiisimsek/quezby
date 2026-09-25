<?php

namespace App\Http\Requests\Admin;

use App\Enums\LeaderboardPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BoardKeysRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'board' => ['required', Rule::enum(LeaderboardPeriod::class)],
            'season' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:90'],
        ];
    }

    public function board(): LeaderboardPeriod
    {
        return LeaderboardPeriod::from((string) $this->validated('board'));
    }
}
