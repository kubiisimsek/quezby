<?php

namespace App\Http\Requests;

use App\Support\Cursor;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/** A list that pages behind a cursor (`GET /me/friends`, `GET /me/runs`): the first page, or the one after `cursor`. */
class CursorRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cursor' => ['bail', 'nullable', 'string', 'max:200', function (string $attribute, string $value, Closure $fail) {
                if (Cursor::decode($value) === null) {
                    $fail(__('messages.cursor'));
                }
            }],
        ];
    }

    /**
     * @return array{0: string, 1: string}|null
     */
    public function cursor(): ?array
    {
        $cursor = $this->validated('cursor');

        return is_string($cursor) ? Cursor::decode($cursor) : null;
    }
}
