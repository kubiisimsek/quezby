<?php

namespace App\Http\Requests;

use App\Enums\Locale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `UpdateLocaleRequest` in `packages/types`: one of the eight languages. */
class UpdateLocaleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'locale' => ['required', 'string', Rule::enum(Locale::class)],
        ];
    }

    public function locale(): Locale
    {
        return Locale::from((string) $this->validated('locale'));
    }
}
