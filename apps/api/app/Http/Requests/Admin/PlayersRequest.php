<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class PlayersRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:191'],
            'status' => ['nullable', Rule::in(['active', 'banned', 'guest'])],
            'platform' => ['nullable', Rule::in(['ios', 'android'])],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'best', 'lastPlayed'])],
        ];
    }
}
