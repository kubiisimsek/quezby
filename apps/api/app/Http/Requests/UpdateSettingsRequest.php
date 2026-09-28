<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    /**
     * Every known setting is a JSON boolean; unknown keys are ignored.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'haptics' => ['sometimes', 'boolean:strict'],
            // The player's yes or no to usage analytics (`docs/product/analytics.md`).
            'analytics' => ['sometimes', 'boolean:strict'],
            // Which news a push tells the player's phones about (`PushService`).
            'pushFriends' => ['sometimes', 'boolean:strict'],
            'pushVs' => ['sometimes', 'boolean:strict'],
            'pushMessages' => ['sometimes', 'boolean:strict'],
        ];
    }
}
