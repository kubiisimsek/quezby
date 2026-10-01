<?php

namespace App\Http\Requests;

use App\Enums\LogLevel;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `AppLogRequest` in `packages/types`: errors the phone swallowed, for the
 * panel's Loglar page — at most `quezby.logs.app_batch` at once, each a level,
 * an event like `push.token`, a message and a flat context of short values.
 */
class AppLogRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'entries' => ['required', 'array', 'min:1', 'max:'.(config('quezby.logs.app_batch') ?? 20)],
            'entries.*' => ['required', 'array:level,event,message,context,at'],
            'entries.*.level' => ['required', Rule::enum(LogLevel::class)],
            'entries.*.event' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9_]+(\.[a-z0-9_]+)*$/'],
            'entries.*.message' => ['required', 'string', 'max:500'],
            'entries.*.context' => ['nullable', 'array', 'max:20', $this->flat(...)],
            'entries.*.at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return list<array{level: LogLevel, event: string, message: string, context: array<string, scalar|null>, at: string|null}>
     */
    public function entries(): array
    {
        return array_values(array_map(fn (array $entry) => [
            'level' => LogLevel::from((string) $entry['level']),
            'event' => (string) $entry['event'],
            'message' => (string) $entry['message'],
            'context' => (array) ($entry['context'] ?? []),
            'at' => isset($entry['at']) ? (string) $entry['at'] : null,
        ], (array) $this->validated('entries')));
    }

    /** A context is one level of short names and short values. */
    private function flat(string $attribute, mixed $value, Closure $fail): void
    {
        foreach ((array) $value as $key => $item) {
            if (! is_string($key) || strlen($key) > 40 || ! (is_scalar($item) || $item === null) || (is_string($item) && mb_strlen($item) > 300)) {
                $fail(__('validation.array', ['attribute' => $attribute]));

                return;
            }
        }
    }
}
