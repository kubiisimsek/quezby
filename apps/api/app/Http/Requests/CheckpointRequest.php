<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `CheckpointRequest` in `packages/types`. */
class CheckpointRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reel' => ['required', 'integer', 'min:1', 'max:'.config('quezby.runs.max_actions')],
            'prefixHash' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reel' => 'post sayısı',
            'prefixHash' => 'hamle özeti',
        ];
    }

    /** Reels played so far: the length of the log the hash covers. */
    public function reel(): int
    {
        return (int) $this->validated('reel');
    }

    /** `prefixHash(actions, reel)` of `@quezby/config`: lower-case hex SHA-256. */
    public function prefixHash(): string
    {
        return (string) $this->validated('prefixHash');
    }
}
