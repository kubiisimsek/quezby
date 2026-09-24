<?php

namespace App\Http\Requests;

use App\Enums\RunMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `StartRunRequest` in `packages/types`. An app that sends no versions is one
 * that predates them — it gets `engine_outdated`, not a validation error, so
 * it can tell the player to update.
 */
class StartRunRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'mode' => ['sometimes', Rule::enum(RunMode::class)],
            'engineVersion' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'contentVersion' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    public function mode(): RunMode
    {
        return RunMode::from((string) ($this->validated('mode') ?? RunMode::Free->value));
    }

    public function engineVersion(): int
    {
        return (int) ($this->validated('engineVersion') ?? 0);
    }

    public function contentVersion(): int
    {
        return (int) ($this->validated('contentVersion') ?? 0);
    }

    public function appVersion(): ?string
    {
        $version = $this->header('X-App-Version');

        return is_string($version) && $version !== '' ? $version : null;
    }
}
