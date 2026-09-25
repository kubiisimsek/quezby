<?php

namespace App\Http\Requests\Admin;

use App\Enums\LeagueTier;
use Illuminate\Validation\Rule;

class LeaguesRequest extends PageRequest
{
    /**
     * @return array<string, mixed>
     */
    protected function filters(): array
    {
        return [
            'week' => ['nullable', 'string', 'regex:/^\d{4}-W\d{2}$/'],
            'tier' => ['nullable', Rule::in(array_map(fn (LeagueTier $tier) => $tier->slug(), LeagueTier::cases()))],
        ];
    }

    public function tier(): ?LeagueTier
    {
        $slug = $this->validated('tier');
        foreach (LeagueTier::cases() as $tier) {
            if ($tier->slug() === $slug) {
                return $tier;
            }
        }

        return null;
    }
}
