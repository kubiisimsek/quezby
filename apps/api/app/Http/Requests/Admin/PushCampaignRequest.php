<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use Illuminate\Validation\Rule;

/**
 * `AdminPushCampaignRequest` in `packages/types`: the words in one language
 * or more, the language the rest get, and who they go to.
 */
class PushCampaignRequest extends PushAudienceRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $locales = array_map(fn (Locale $locale) => $locale->value, Locale::cases());
        $given = array_keys((array) $this->input('messages', []));

        return [
            'messages' => ['required', 'array', 'min:1', 'array:'.implode(',', $locales)],
            'messages.*' => ['required', 'array:title,body'],
            'messages.*.title' => ['required', 'string', 'max:60'],
            'messages.*.body' => ['required', 'string', 'max:240'],
            'fallback' => ['required', Rule::enum(Locale::class), Rule::in($given)],
            ...parent::rules(),
        ];
    }

    /**
     * @return array<string, array{title: string, body: string}>
     */
    public function words(): array
    {
        return array_map(fn (array $message) => [
            'title' => trim((string) $message['title']),
            'body' => trim((string) $message['body']),
        ], (array) $this->validated('messages'));
    }

    public function fallback(): string
    {
        return (string) $this->validated('fallback');
    }
}
