<?php

namespace App\Http\Requests;

use App\Enums\Phrase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `SendPhraseRequest` in `packages/types`: one of the phrases, never a typed word. */
class SendPhraseRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phrase' => ['required', 'string', Rule::enum(Phrase::class)],
        ];
    }

    public function phrase(): Phrase
    {
        return Phrase::from((string) $this->validated('phrase'));
    }
}
