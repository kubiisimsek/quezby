<?php

namespace App\Http\Resources;

use App\Models\Run;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `RunResult` in `packages/types` — always the server's replay, never the
 * app's claim.
 *
 * @mixin Run
 */
class RunResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $stats = $this->stats ?? [];
        $bonusPoints = (int) ($this->bonus_points ?? 0);
        $bonuses = [];
        foreach (['flawless', 'lightning', 'coolHead', 'comeback'] as $kind) {
            $bonuses[$kind] = [
                'count' => (int) ($stats['bonuses'][$kind] ?? 0),
                'points' => (int) ($stats['bonusPoints'][$kind] ?? 0),
            ];
        }

        return [
            'runId' => $this->id,
            'mode' => $this->mode->value,
            'status' => $this->status->value,
            'score' => $this->score,
            'reels' => $this->reels,
            'hits' => $this->hits,
            'misses' => $this->misses,
            'perfects' => $this->perfects,
            'maxStreak' => $this->max_streak,
            'level' => $this->level,
            'accuracy' => $this->accuracy,
            'avgReactionMs' => $this->avg_reaction_ms,
            'activeMs' => $this->active_ms,
            'endedBy' => $this->ended_by?->value,
            'maxCombo' => (int) ($this->max_combo ?? 1000),
            'breakdown' => [
                'reelPoints' => (int) $this->score - $bonusPoints,
                'bonusPoints' => $bonusPoints,
                'bonuses' => $bonuses,
            ],
            'stats' => [
                'swipes' => $stats['swipes'] ?? 0,
                'likes' => $stats['likes'] ?? 0,
                'holds' => $stats['holds'] ?? 0,
                'perfects' => $stats['perfects'] ?? 0,
                'freezes' => $stats['freezes'] ?? 0,
                'misses' => $stats['misses'] ?? ['timeout' => 0, 'wrong' => 0, 'holdEarly' => 0, 'holdLate' => 0, 'caught' => 0],
                'avgReactionMs' => $stats['avgReactionMs'] ?? 0,
                'bestReactionMs' => $stats['bestReactionMs'] ?? null,
                'levelMisses' => $stats['levelMisses'] ?? [],
            ],
        ];
    }
}
