<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeaderboardRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'limit' => ['nullable', 'integer', 'min:1', 'max:'.config('quezby.leaderboard.max_limit')],
            'scope' => ['nullable', Rule::in(['everyone', 'friends'])],
        ];
    }

    public function limit(): int
    {
        return (int) ($this->validated('limit') ?? config('quezby.leaderboard.default_limit'));
    }

    /** `everyone`, or `friends`: the players the caller follows, and the caller. */
    public function scope(): string
    {
        return (string) ($this->validated('scope') ?? 'everyone');
    }
}
