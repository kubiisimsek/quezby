<?php

namespace App\Http\Requests;

use App\Enums\RunMode;
use Illuminate\Validation\Rule;

/** `GET /me/runs`: a page of the player's past games, of one mode or all. */
class RunHistoryRequest extends CursorRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return parent::rules() + [
            'mode' => ['nullable', Rule::enum(RunMode::class)],
        ];
    }

    public function mode(): ?RunMode
    {
        $mode = $this->validated('mode');

        return is_string($mode) ? RunMode::from($mode) : null;
    }
}
