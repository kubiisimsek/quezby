<?php

namespace App\Http\Requests\Admin;

use App\Game\ReelKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContentRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'kind' => ['nullable', Rule::enum(ReelKind::class)],
            'sort' => ['nullable', Rule::in(['shows', 'likeRate', 'missRate'])],
        ];
    }
}
