<?php

namespace Database\Factories;

use App\Content\Catalog;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Difficulty;
use App\Game\EndReason;
use App\Game\Rules;
use App\Models\Run;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Run>
 */
class RunFactory extends Factory
{
    /**
     * A run that was started and not finished yet.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->withUsername(),
            'seed' => fake()->numberBetween(1, 4294967295),
            'engine_version' => Rules::ENGINE_VERSION,
            'content_version' => Catalog::LATEST,
            'difficulty' => 0,
            'status' => RunStatus::Started,
            'mode' => RunMode::Free,
            'started_at' => now(),
        ];
    }

    /** Today's "Günün akışı" run of `$dayKey`. */
    public function daily(string $dayKey): static
    {
        return $this->state(fn (array $attributes) => [
            'mode' => RunMode::Daily,
            'daily_key' => $dayKey,
        ]);
    }

    /**
     * A Dereceli run: the only kind that plays for Elo, on this difficulty
     * table — at `$difficulty` (0 unless given).
     */
    public function rated(int $difficulty = 0): static
    {
        return $this->state(fn (array $attributes) => [
            'mode' => RunMode::Rated,
            'difficulty' => $difficulty,
            'difficulty_version' => Difficulty::VERSION,
        ]);
    }

    /** A finished, ranked run with the given result. */
    public function ranked(int $score, int $reels = 100): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => RunStatus::Ranked,
            'finished_at' => now(),
            'score' => $score,
            'reels' => $reels,
            'hits' => $reels,
            'misses' => 0,
            'perfects' => 0,
            'max_streak' => $reels,
            'max_combo' => 1500,
            'bonus_points' => 0,
            'level' => $reels === 0 ? 1 : 1 + intdiv($reels - 1, Rules::LEVEL_EVERY),
            'accuracy' => $reels === 0 ? 0 : 1000,
            'avg_reaction_ms' => 400,
            'active_ms' => $reels * 500,
            'ended_by' => EndReason::Drained,
        ]);
    }
}
