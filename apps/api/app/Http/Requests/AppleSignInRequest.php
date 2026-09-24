<?php

namespace App\Http\Requests;

use App\Enums\Platform;
use Illuminate\Validation\Rule;

/** `AppleSignInRequest` in `packages/types`. */
class AppleSignInRequest extends AppleLinkRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'platform' => ['required', 'string', Rule::enum(Platform::class)],
            'installId' => ['required', 'string', 'max:100'],
        ];
    }

    public function platform(): Platform
    {
        return Platform::from((string) $this->validated('platform'));
    }

    public function installId(): string
    {
        return (string) $this->validated('installId');
    }
}
