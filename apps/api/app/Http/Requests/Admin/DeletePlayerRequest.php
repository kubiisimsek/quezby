<?php

namespace App\Http\Requests\Admin;

/** Deleting an account takes a reason and the player's name, typed out. */
class DeletePlayerRequest extends ReasonRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'confirm' => ['required', 'string', 'max:64'],
        ];
    }
}
