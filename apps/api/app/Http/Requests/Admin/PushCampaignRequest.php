<?php

namespace App\Http\Requests\Admin;

/** `AdminPushCampaignRequest` in `packages/types`: the words, and who they go to. */
class PushCampaignRequest extends PushAudienceRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:60'],
            'body' => ['required', 'string', 'max:240'],
            ...parent::rules(),
        ];
    }

    public function title(): string
    {
        return trim((string) $this->validated('title'));
    }

    public function body(): string
    {
        return trim((string) $this->validated('body'));
    }
}
