<?php

namespace App\Http\Requests\Admin;

use App\Game\ReelKind;
use Illuminate\Validation\Rule;

class ContentRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'kind' => ['nullable', Rule::enum(ReelKind::class)],
            'sort' => ['nullable', Rule::in(['shows', 'likeRate', 'missRate'])],
        ];
    }
}
