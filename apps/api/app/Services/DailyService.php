<?php

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;

/**
 * "Günün akışı": one seed for everyone each Istanbul day, one attempt each.
 * Its board is `challenge`; its share card is built here, from the server's
 * replay, so the app only has to show it.
 */
final class DailyService
{
    public function __construct(
        private readonly DailySeed $seeds,
        private readonly LeaderboardService $leaderboards,
        #[Config('quezby.daily.epoch')]
        private readonly string $epoch,
    ) {}

    public function dayKey(CarbonInterface $at): string
    {
        return $this->leaderboards->keyAt(LeaderboardPeriod::Challenge, $at);
    }

    public function seed(string $dayKey): int
    {
        return $this->seeds->for($dayKey, Rules::ENGINE_VERSION);
    }

    /** "Günün akışı #17": the epoch's day is #1. */
    public function number(string $dayKey): int
    {
        $timezone = $this->leaderboards->timezone();
        $first = CarbonImmutable::parse($this->epoch, $timezone)->startOfDay();
        $day = CarbonImmutable::parse($dayKey, $timezone)->startOfDay();

        return max(1, (int) $first->diffInDays($day) + 1);
    }

    /**
     * One square per 20-reel level: 🟩 no miss, 🟨 one or two, 🟥 more — and ⬛
     * for the level the run ended on.
     *
     * @param  list<int>  $levelMisses
     */
    public function grid(array $levelMisses): string
    {
        if ($levelMisses === []) {
            return '⬛';
        }

        $squares = array_map(fn (int $misses) => match (true) {
            $misses === 0 => '🟩',
            $misses <= 2 => '🟨',
            default => '🟥',
        }, array_slice($levelMisses, 0, -1));
        $squares[] = '⬛';

        return implode('', $squares);
    }

    public function shareText(int $number, string $grid, int $score, ?int $rank, int $players): string
    {
        $lines = [
            "Quezby · Günün akışı #{$number}",
            $grid,
            self::thousands($score).' puan'.($rank === null ? '' : ' · #'.$rank.'/'.self::thousands($players)),
        ];

        return implode("\n", $lines);
    }

    /**
     * `DailyResult` in `packages/types`, for a daily run the server just closed.
     *
     * @return array<string, mixed>
     */
    public function resultFor(Run $run): array
    {
        $dayKey = (string) $run->daily_key;
        $number = $this->number($dayKey);
        $grid = $this->grid($run->stats['levelMisses'] ?? []);
        $players = $this->leaderboards->scope(LeaderboardPeriod::Challenge, $dayKey)->count();
        $row = $run->status === RunStatus::Ranked
            ? $this->leaderboards->rowOf($run->user, LeaderboardPeriod::Challenge, $dayKey)
            : null;
        $rank = $row === null ? null : $this->leaderboards->rankOf($row);

        return [
            'dayKey' => $dayKey,
            'number' => $number,
            'rank' => $rank,
            'players' => $players,
            'grid' => $grid,
            'shareText' => $this->shareText($number, $grid, (int) $run->score, $rank, $players),
        ];
    }

    /**
     * `DailyResponse` in `packages/types`: today's challenge, the player's one
     * attempt, and the top of today's board.
     *
     * @return array<string, mixed>
     */
    public function state(User $user, ?CarbonInterface $at = null): array
    {
        $at ??= now();
        $dayKey = $this->dayKey($at);
        $bounds = $this->leaderboards->boundsAt(LeaderboardPeriod::Challenge, $at);
        $board = $this->leaderboards->board(LeaderboardPeriod::Challenge, 'everyone', 3, $user, $at);

        $run = $user->runs()->where('mode', RunMode::Daily)->where('daily_key', $dayKey)->first();

        return [
            'dayKey' => $dayKey,
            'number' => $this->number($dayKey),
            'endsAt' => Timestamp::iso($bounds[1] ?? null),
            'serverTime' => Timestamp::iso(now()),
            'attempt' => $run === null ? null : $this->attemptOf($run),
            'top' => $board['entries'],
            'me' => $board['me'],
            'players' => $board['players'],
        ];
    }

    /**
     * @return array{status: string, score: int|null, rank: int|null, grid: string|null, shareText: string|null}
     */
    private function attemptOf(Run $run): array
    {
        if ($run->status === RunStatus::Started) {
            return ['status' => 'unfinished', 'score' => null, 'rank' => null, 'grid' => null, 'shareText' => null];
        }
        if (! $run->status->isVisible()) {
            return ['status' => 'void', 'score' => null, 'rank' => null, 'grid' => null, 'shareText' => null];
        }
        $result = $this->resultFor($run);

        return [
            'status' => $run->status->value,
            'score' => $run->score,
            'rank' => $result['rank'],
            'grid' => $result['grid'],
            'shareText' => $result['shareText'],
        ];
    }

    private static function thousands(int $value): string
    {
        return number_format($value, 0, ',', '.');
    }
}
