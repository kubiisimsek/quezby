<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/** `AdminPushRequest` in `packages/types`: a push's title and words, as the player will read them. */
class PushMessageRequest extends FormRequest
{
    public const TITLE_MAX = 60;

    public const BODY_MAX = 240;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'body' => ['required', 'string', 'max:'.self::BODY_MAX],
        ];
    }

    public function title(): string
    {
        return trim((string) $this->validated('title'));
    }

    public function body(): string
    {
        return trim((string) $this->validated('body'));
    }
}
