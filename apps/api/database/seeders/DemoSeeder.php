<?php

namespace Database\Seeders;

use App\Content\Catalog;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Game\RunSummary;
use App\Models\LeagueGroup;
use App\Models\Run;
use App\Models\User;
use App\Services\FollowService;
use App\Services\RunService;
use App\Support\Username;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use LogicException;
use Random\Engine\Xoshiro256StarStar;
use Random\Randomizer;
use RuntimeException;

/**
 * Local demo data, played the real way. Two dozen players and eight Istanbul
 * days of runs, each one started and finished through `RunService`: the
 * server replays it, and the boards, today's "Günün akışı", the leagues and
 * the lifetime numbers fill exactly as they would in production. A small bot
 * plays for the players — the engine's own thumbs, casual to pro — while the
 * clock is moved on so every run took as long as it would on a phone.
 *
 *     php artisan db:seed --class=DemoSeeder
 *
 * Local only, and not part of `DatabaseSeeder`. Does nothing once the demo
 * players exist.
 */
final class DemoSeeder extends Seeder
{
    /** Casual first, pro last: a player's skill is their place in this list. */
    private const USERNAMES = [
        'ayse.nur', 'mehmet.k', 'zeynep34', 'emre*can', 'elif.su', 'burak07',
        'selin.ay', 'kaan.demir', 'deniz*ege', 'cagla.1905', 'gokhan.tr', 'irem.ist',
        'baris.m', 'ozge35', 'tugce.k', 'yusuf.34', 'merve*nur', 'onur.sen',
        'ceren07', 'hakan.ank', 'ebru.izmir', 'serkan*tr', 'dilara.b', 'kerem.35',
    ];

    /** The most a run's clock goes past the least time the app needs for it: a human's pauses. */
    private const SLACK_MS = 6000;

    /** Less time than this left in a day, and a player does not start another run. */
    private const MIN_RUN_MS = 45000;

    public function __construct(
        /** How many of the demo players to create, at most 24. */
        public int $players = 24,
        /** Istanbul days to fill, today included. Eight always reach back into last week's league. */
        public int $days = 8,
    ) {}

    public function run(RunService $runs, FollowService $follows): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('DemoSeeder only runs locally (APP_ENV=local): it plays hundreds of made-up runs onto the boards.');
        }

        $names = array_slice(self::USERNAMES, 0, max(1, min($this->players, count(self::USERNAMES))));
        if (User::query()->whereIn('username', $names)->exists()) {
            $this->command?->outputComponents()->warn('The demo players are already here; nothing to do.');

            return;
        }

        $clock = hrtime(true);
        $testNow = Carbon::getTestNow();
        $now = CarbonImmutable::now('UTC');
        $timezone = (string) config('quezby.leaderboard.timezone');
        $today = $now->setTimezone($timezone)->startOfDay();
        $first = $today->subDays(max(1, $this->days) - 1);

        try {
            DB::transaction(function () use ($runs, $follows, $names, $now, $today, $first) {
                $players = $this->createPlayers($names, $first);
                $this->follow($players, $follows, $first);

                for ($day = $first; $day->lessThanOrEqualTo($today); $day = $day->addDay()) {
                    foreach ($players as $player) {
                        $this->playDay($runs, $player, $day, $day->equalTo($today), $now);
                    }
                }
            });
        } finally {
            Carbon::setTestNow($testNow);
        }

        $this->report($names, (hrtime(true) - $clock) / 1e9);
    }

    /**
     * @param  list<string>  $names
     * @return list<array{user: User, skill: float, top: bool}>
     */
    private function createPlayers(array $names, CarbonImmutable $first): array
    {
        $players = [];
        $last = count($names) - 1;
        foreach ($names as $i => $name) {
            $username = Username::validate($name)->normalized
                ?? throw new LogicException("The demo username {$name} breaks the username rules.");

            // Signed up over the month before the first day of play.
            Carbon::setTestNow($first->subDays(30 - $i)->setTime(8 + $i % 14, 7 * $i % 60)->utc());
            $players[] = [
                'user' => User::query()->create([
                    'username' => $username,
                    'platform' => $i % 3 === 0 ? 'android' : 'ios',
                    // One phone each: players sharing an install are a daily-challenge warning sign.
                    'install_id' => 'demo-'.$username,
                ]),
                'skill' => $last === 0 ? 1.0 : $i / $last,
                'top' => $i === $last,
            ];
        }

        return $players;
    }

    /**
     * Everyone follows a few players near them in the list, and every other
     * player follows the best one — through the service, like the app does.
     *
     * @param  list<array{user: User, skill: float, top: bool}>  $players
     */
    private function follow(array $players, FollowService $follows, CarbonImmutable $first): void
    {
        $count = count($players);
        $at = $first->subDay()->setTime(9, 0);
        foreach ($players as $i => $player) {
            $targets = [($i + 1) % $count, ($i + 3) % $count];
            if ($i % 3 === 0) {
                $targets[] = ($i + 7) % $count;
            }
            if ($i % 2 === 0) {
                $targets[] = $count - 1;
            }
            foreach (array_unique($targets) as $j) {
                if ($j === $i) {
                    continue;
                }
                $at = $at->addMinutes(11 + ($i + $j) % 17);
                Carbon::setTestNow($at->utc());
                $follows->follow($player['user'], $players[$j]['user']);
            }
        }
    }

    /**
     * One player's session on one day: today's challenge first, then a free
     * run or two. Everyone plays today; on other days the better players show
     * up more often and stay longer.
     *
     * @param  array{user: User, skill: float, top: bool}  $player
     */
    private function playDay(RunService $runs, array $player, CarbonImmutable $day, bool $isToday, CarbonImmutable $now): void
    {
        $dice = self::dice(crc32($player['user']->username.'|'.$day->format('Y-m-d')));
        $skill = $player['skill'];
        $thumb = self::thumb($skill);

        if ($isToday) {
            $plan = [[RunMode::Daily, $thumb]];
            if ($dice->nextFloat() < 0.3 + 0.4 * $skill) {
                $plan[] = [RunMode::Free, $thumb];
            }
            if ($player['top']) {
                // A thumb that keeps a metronome's time: its top score waits in `quezby:review`.
                $plan[] = [RunMode::Free, self::machine()];
            }
            $session = $player['top'] ? 170 : $dice->getInt(40, 150);
            $at = CarbonImmutable::createFromTimestampMs(max(
                $day->addMinute()->getTimestampMs(),
                $now->subMinutes($session)->getTimestampMs(),
            ));
            $deadline = $now->subSeconds(5);
        } else {
            if ($dice->nextFloat() >= 0.3 + 0.55 * $skill) {
                return;
            }
            $plan = $dice->nextFloat() < 0.8 ? [[RunMode::Daily, $thumb]] : [];
            $plan[] = [RunMode::Free, $thumb];
            if ($dice->nextFloat() < 0.2 + 0.4 * $skill) {
                $plan[] = [RunMode::Free, $thumb];
            }
            $at = $day->setTime(9, 0)->addMinutes($dice->getInt(0, 12 * 60));
            $deadline = $day->setTime(23, 50);
        }

        foreach ($plan as [$mode, $hand]) {
            $finishedAt = $this->playRun($runs, $player['user'], $mode, $hand, $at->utc(), $deadline->utc());
            if ($finishedAt === null) {
                return;
            }
            $at = $finishedAt->addSeconds($dice->getInt(20, 240));
        }
    }

    /**
     * Starts a run at `$at`, lets the bot play it, and finishes it once the
     * clock shows the time that took. Null when there is no time left for it.
     *
     * @param  array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}  $thumb
     */
    private function playRun(RunService $runs, User $user, RunMode $mode, array $thumb, CarbonImmutable $at, CarbonImmutable $deadline): ?CarbonImmutable
    {
        $budgetMs = $deadline->getTimestampMs() - $at->getTimestampMs() - self::SLACK_MS;
        if ($budgetMs < self::MIN_RUN_MS) {
            return null;
        }

        Carbon::setTestNow($at);
        $run = $runs->start($user, $mode, Rules::ENGINE_VERSION, Catalog::LATEST, '1.0.0');

        $dice = self::dice($run->seed ^ crc32($user->id));
        [$actions, $summary, $neededMs] = $this->play($run->seed, $thumb, $dice, $budgetMs);

        $finishedAt = $at->addMilliseconds($neededMs + $dice->getInt(1500, self::SLACK_MS));
        Carbon::setTestNow($finishedAt);
        $runs->finish($user, $run->id, $actions, $summary->score, $summary->reels);

        return $finishedAt;
    }

    /**
     * The bot: plays reel by reel on its own engine until the run is over, or
     * until the next reel would not fit in `$budgetMs` — then it quits. Also
     * says how long the app needs at the least for that log, ms: the sum
     * `RunVerifier::wallClock` checks, without its tolerance.
     *
     * @param  array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}  $thumb
     * @return array{0: list<array{int, int, int}>, 1: RunSummary, 2: int}
     */
    private function play(int $seed, array $thumb, Randomizer $dice, int $budgetMs): array
    {
        $pace = config('quezby.plausibility.pace');
        $countdownMs = $pace['countdown_step_ms'] * $pace['countdown_steps'];
        $engine = new Engine($seed);
        $actions = [];
        $steps = [];

        $boundMs = $countdownMs;
        while (! $engine->isOver()) {
            $reel = $engine->current();
            $action = $this->decide($engine, $thumb, $dice);
            $activeMs = match (Gesture::from($action[0])) {
                Gesture::None => $reel->window,
                Gesture::Hold => $action[1] + $action[2],
                default => $action[1],
            };
            $boundMs += $activeMs + $pace['slide_ms'] + max($pace['exit_ms']);
            if ($boundMs > $budgetMs) {
                break;
            }
            $steps[] = $engine->apply($action);
            $actions[] = $action;
        }
        $engine->quit();
        $summary = $engine->summary();

        $neededMs = $countdownMs + $summary->activeMs;
        foreach ($steps as $step) {
            $neededMs += $pace['slide_ms'] + match (true) {
                ! $step->verdict->isHit() => $pace['exit_ms']['miss'],
                $step->reel->kind === ReelKind::Skip => $pace['exit_ms']['skip_hit'],
                default => $pace['exit_ms']['hit'],
            };
        }

        return [$actions, $summary, $neededMs];
    }

    /**
     * `Bot.decide` of `packages/engine/src/bot.ts`, but no swipe or like is
     * ever decided faster than the server believes a thumb can.
     *
     * @param  array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}  $thumb
     * @return array{int, int, int}
     */
    private function decide(Engine $engine, array $thumb, Randomizer $dice): array
    {
        $reel = $engine->current();
        $floor = (int) config('quezby.plausibility.fast_decision_ms');
        $reaction = max($floor, (int) round(self::normal($dice, $thumb['reaction'], $thumb['reactionSd'])));
        $pressure = max(0, $reaction - $reel->window * 0.7) / $reel->window;
        $slip = $thumb['slip'] + $pressure * 0.6;
        $none = [Gesture::None->value, 0, 0];

        if ($reel->kind === ReelKind::Freeze) {
            return $dice->nextFloat() < $thumb['reflex'] + $pressure * 0.3
                ? [Gesture::Touch->value, min($reel->window - 1, (int) round($reaction * 0.8)), 0]
                : $none;
        }
        if ($reel->kind === ReelKind::Like) {
            if ($dice->nextFloat() < $slip * 1.5) {
                return $reaction < $reel->window ? [Gesture::Up->value, $reaction, 0] : $none;
            }
            $second = $reaction + $thumb['tapGap'];

            return $second < $reel->window ? [Gesture::Like->value, $second, 0] : $none;
        }
        if ($reaction >= $reel->window) {
            return $none;
        }
        if ($reel->kind === ReelKind::Skip) {
            return $dice->nextFloat() < $slip ? [Gesture::Like->value, $reaction, 0] : [Gesture::Up->value, $reaction, 0];
        }
        if ($dice->nextFloat() < $slip * 0.5) {
            return [Gesture::Up->value, $reaction, 0];
        }
        $release = (int) round(self::normal($dice, $reel->zoneCenter * $reel->holdFill / 1000, $thumb['holdSd']));

        return [Gesture::Hold->value, $reaction, min(max(1, $release), $engine->holdFailAfter())];
    }

    /**
     * A thumb between the engine's casual (0) and pro (1) profiles.
     *
     * @return array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}
     */
    private static function thumb(float $skill): array
    {
        $between = fn (float $casual, float $pro): float => $casual + ($pro - $casual) * $skill;

        return [
            'reaction' => (int) round($between(640, 380)),
            'reactionSd' => (int) round($between(150, 70)),
            'slip' => $between(0.06, 0.012),
            'reflex' => $between(0.2, 0.045),
            'holdSd' => (int) round($between(95, 30)),
            'tapGap' => (int) round($between(170, 110)),
        ];
    }

    /**
     * Never a slip, every decision at the same millisecond, every hold let go
     * dead centre: a score no reviewer should wave through unseen.
     *
     * @return array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}
     */
    private static function machine(): array
    {
        return ['reaction' => 330, 'reactionSd' => 0, 'slip' => 0.0, 'reflex' => 0.0, 'holdSd' => 0, 'tapGap' => 0];
    }

    private static function dice(int $seed): Randomizer
    {
        return new Randomizer(new Xoshiro256StarStar($seed));
    }

    /** Box–Muller, like the engine's bot. */
    private static function normal(Randomizer $dice, float $mean, float $sd): float
    {
        $u = max($dice->nextFloat(), 1e-9);
        $v = $dice->nextFloat();

        return $mean + sqrt(-2 * log($u)) * cos(2 * M_PI * $v) * $sd;
    }

    /**
     * @param  list<string>  $names
     */
    private function report(array $names, float $seconds): void
    {
        $users = User::query()->whereIn('username', $names)->pluck('id');
        $runs = Run::query()->whereIn('user_id', $users)->toBase()->selectRaw('status, count(*) as runs')->groupBy('status')->pluck('runs', 'status');
        $follows = DB::table('follows')->whereIn('follower_id', $users)->count();

        $this->command?->outputComponents()->info(sprintf(
            'Demo: %d players, %d runs (%d ranked, %d held for review), %d follows, %d league groups — %.1f s.',
            $users->count(),
            $runs->sum(),
            $runs[RunStatus::Ranked->value] ?? 0,
            $runs[RunStatus::Review->value] ?? 0,
            $follows,
            LeagueGroup::query()->count(),
            $seconds,
        ));
    }
}
