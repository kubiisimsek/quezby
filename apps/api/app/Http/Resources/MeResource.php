<?php

namespace App\Http\Resources;

use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Support\Timestamp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `Me` in `packages/types`.
 *
 * @mixin User
 */
class MeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $identities = $this->identities()->orderBy('provider')->get()
            ->map(fn (SocialIdentity $identity) => $identity->provider->value)
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'isGuest' => $this->email === null && $identities === [],
            'identities' => $identities,
            'settings' => $this->resolvedSettings(),
            'best' => self::best($this->resource),
            'createdAt' => Timestamp::iso($this->created_at),
        ];
    }

    /**
     * `BestScore` in `packages/types`: the season's all-time row.
     *
     * @return array{score: int, reels: int, achievedAt: string|null}|null
     */
    public static function best(User $user): ?array
    {
        $best = app(LeaderboardService::class)->bestOf($user);
        if ($best === null) {
            return null;
        }

        return [
            'score' => $best->score,
            'reels' => $best->reels,
            'achievedAt' => Timestamp::iso($best->achieved_at),
        ];
    }
}
