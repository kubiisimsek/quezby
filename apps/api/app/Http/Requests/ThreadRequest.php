<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `GET /me/threads/{username}`: the newest page, or the one before `before` (a message id). */
class ThreadRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'before' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function before(): ?int
    {
        $before = $this->validated('before');

        return $before === null ? null : (int) $before;
    }
}
