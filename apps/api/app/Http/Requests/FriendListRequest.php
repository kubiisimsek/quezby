<?php

namespace App\Http\Requests;

use App\Support\NameCursor;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /users/{username}/friends`: the first page, or the one after `cursor` (a name, A to Z). */
class FriendListRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cursor' => ['bail', 'nullable', 'string', 'max:200', function (string $attribute, string $value, Closure $fail) {
                if (NameCursor::decode($value) === null) {
                    $fail(__('messages.cursor'));
                }
            }],
        ];
    }

    /** The last username of the page before, if any. */
    public function afterUsername(): ?string
    {
        $cursor = $this->validated('cursor');

        return is_string($cursor) ? NameCursor::decode($cursor) : null;
    }
}
