<?php

namespace App\Http\Requests;

use App\Enums\RunMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `StartRunRequest` in `packages/types`. An app that sends no versions is one
 * that predates them — it gets `engine_outdated`, not a validation error, so
 * it can tell the player to update; so does a rated run from an app without
 * the difficulty table (`difficultyVersion`). A VS names either the friend it
 * challenges (`opponent`) or the VS it answers (`duel`) — one of the two.
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
            'difficultyVersion' => ['sometimes', 'integer', 'min:0', 'max:255'],
            'opponent' => [
                'nullable', 'string', 'max:40', 'prohibits:duel',
                Rule::requiredIf(fn () => $this->input('mode') === RunMode::Vs->value && ! $this->filled('duel')),
            ],
            'duel' => ['nullable', 'string', 'ulid'],
        ];
    }

    public function opponent(): ?string
    {
        $opponent = $this->validated('opponent');

        return $this->mode() === RunMode::Vs && is_string($opponent) && $opponent !== '' ? $opponent : null;
    }

    public function duel(): ?string
    {
        $duel = $this->validated('duel');

        return $this->mode() === RunMode::Vs && is_string($duel) && $duel !== '' ? strtolower($duel) : null;
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

    /** The Dereceli difficulty table the app plays; null from an app that predates it. */
    public function difficultyVersion(): ?int
    {
        $version = $this->validated('difficultyVersion');

        return $version === null ? null : (int) $version;
    }

    public function appVersion(): ?string
    {
        $version = $this->header('X-App-Version');

        return is_string($version) && $version !== '' ? $version : null;
    }
}
