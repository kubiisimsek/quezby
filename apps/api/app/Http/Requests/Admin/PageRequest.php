<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A page of an admin list: `page` from 1, `perPage` up to
 * `quezby.admin.max_per_page`. Lists add their filters to `filters()`.
 */
class PageRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:'.config('quezby.admin.max_per_page')],
            ...$this->filters(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [];
    }

    public function page(): int
    {
        return (int) ($this->validated('page') ?? 1);
    }

    public function perPage(): int
    {
        return (int) ($this->validated('perPage') ?? config('quezby.admin.per_page'));
    }
}
