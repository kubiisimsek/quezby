<?php

namespace Database\Seeders;

use App\Content\Catalog;
use App\Enums\Platform;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Checkpoint;
use App\Game\Difficulty;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Replay;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\Run;
use App\Models\User;
use App\Services\Integrity\DeviceCheckResult;
use App\Services\Integrity\DeviceIntegrity;
use App\Services\Rating\RatingService;
use App\Services\RunClock;
use App\Services\RunService;
use App\Services\Social\FriendService;
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
 * server replays it, and the boards, today's "Günün akışı", the ratings and
 * the lifetime numbers fill exactly as they would in production. A small bot
 * plays for the players — the engine's own thumbs, casual to pro — while the
 * clock is moved on so every run took as long as it would on a phone: it
 * checks in at the run's checkpoints on time, and every phone passes its
 * device check when the player opens the app.
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

    /**
     * Counted free and daily runs that open a demo player's Dereceli. The
     * players stand for veterans: with the real threshold
     * (`rating.unlock_runs`, 20) a week of demo play would open hardly
     * anyone's. Once it is open, their free runs are rated.
     */
    public const VETERAN_UNLOCK_RUNS = 3;

    /** Rated runs that place a demo veteran (`rating.placement_runs`, 3, for real players). */
    public const VETERAN_PLACEMENT_RUNS = 1;

    public function __construct(
        /** How many of the demo players to create, at most 24. */
        public int $players = 24,
        /** Istanbul days to fill, today included. Eight always reach back into last week. */
        public int $days = 8,
    ) {}

    public function run(FriendService $friends, DeviceIntegrity $devices, RunClock $clock): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('DemoSeeder only runs locally (APP_ENV=local): it plays hundreds of made-up runs onto the boards.');
        }

        $names = array_slice(self::USERNAMES, 0, max(1, min($this->players, count(self::USERNAMES))));
        if (User::query()->whereIn('username', $names)->exists()) {
            $this->command?->outputComponents()->warn('The demo players are already here; nothing to do.');

            return;
        }

        $began = hrtime(true);
        $testNow = Carbon::getTestNow();
        $unlockRuns = config('quezby.rating.unlock_runs');
        $placementRuns = config('quezby.rating.placement_runs');
        config([
            'quezby.rating.unlock_runs' => self::VETERAN_UNLOCK_RUNS,
            'quezby.rating.placement_runs' => self::VETERAN_PLACEMENT_RUNS,
        ]);
        // Resolved after the lines above, so its rating service opens and places at the veterans' thresholds.
        $runs = app(RunService::class);
        $ratings = app(RatingService::class);
        $now = CarbonImmutable::now('UTC');
        $timezone = (string) config('quezby.leaderboard.timezone');
        $today = $now->setTimezone($timezone)->startOfDay();
        $first = $today->subDays(max(1, $this->days) - 1);

        try {
            DB::transaction(function () use ($runs, $ratings, $friends, $devices, $clock, $names, $now, $today, $first) {
                $players = $this->createPlayers($names, $first);
                $this->befriend($players, $friends, $first);

                for ($day = $first; $day->lessThanOrEqualTo($today); $day = $day->addDay()) {
                    foreach ($players as $player) {
                        $this->playDay($runs, $ratings, $devices, $clock, $player, $day, $day->equalTo($today), $now);
                    }
                }
            });
        } finally {
            Carbon::setTestNow($testNow);
            config(['quezby.rating.unlock_runs' => $unlockRuns, 'quezby.rating.placement_runs' => $placementRuns]);
        }

        $this->report($names, (hrtime(true) - $began) / 1e9);

        // How the demo players use the app, for the admin panel's analytics.
        $this->call(AnalyticsDemoSeeder::class);
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
     * Everyone asks a few players near them in the list to be friends, and
     * every other player asks the best one — through the service, like the
     * app does. Most say yes; a few requests are left waiting.
     *
     * @param  list<array{user: User, skill: float, top: bool}>  $players
     */
    private function befriend(array $players, FriendService $friends, CarbonImmutable $first): void
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
                $friends->add($player['user'], $players[$j]['user']);
                if (($i + $j) % 5 !== 0) {
                    Carbon::setTestNow($at->addMinutes(3)->utc());
                    $friends->add($players[$j]['user'], $player['user']);
                }
            }
        }
    }

    /**
     * One player's session on one day: the app checks the phone on launch,
     * then today's challenge, then a free run or two. Everyone plays today;
     * on other days the better players show up more often and stay longer.
     *
     * @param  array{user: User, skill: float, top: bool}  $player
     */
    private function playDay(RunService $runs, RatingService $ratings, DeviceIntegrity $devices, RunClock $clock, array $player, CarbonImmutable $day, bool $isToday, CarbonImmutable $now): void
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

        if ($at->lessThan($deadline)) {
            // A real phone, running the app from the store: Play Integrity and App Attest vouch for it.
            Carbon::setTestNow($at->utc());
            $devices->record($player['user'], Platform::from((string) $player['user']->platform), DeviceCheckResult::pass(['demo' => true]));
        }

        foreach ($plan as [$mode, $hand]) {
            // A veteran whose Dereceli is open plays for Elo.
            if ($mode === RunMode::Free && $ratings->unlock($player['user']) === null) {
                $mode = RunMode::Rated;
            }
            $finishedAt = $this->playRun($runs, $clock, $player['user'], $mode, $hand, $at->utc(), $deadline->utc());
            if ($finishedAt === null) {
                return;
            }
            $at = $finishedAt->addSeconds($dice->getInt(20, 240));
        }
    }

    /**
     * Starts a run at `$at`, lets the bot play it — checking in at each
     * checkpoint mark as it passes, the way the app does — and finishes it
     * once the clock shows the time that took. Null when there is no time
     * left for it.
     *
     * @param  array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}  $thumb
     */
    private function playRun(RunService $runs, RunClock $clock, User $user, RunMode $mode, array $thumb, CarbonImmutable $at, CarbonImmutable $deadline): ?CarbonImmutable
    {
        $budgetMs = $deadline->getTimestampMs() - $at->getTimestampMs() - self::SLACK_MS;
        if ($budgetMs < self::MIN_RUN_MS) {
            return null;
        }

        Carbon::setTestNow($at);
        $run = $runs->start($user, $mode, Rules::ENGINE_VERSION, Catalog::LATEST, '1.0.0', difficultyVersion: Difficulty::VERSION);

        $dice = self::dice($run->seed ^ crc32($user->id));
        [$actions, $replay] = $this->play($run->seed, $run->difficulty, $thumb, $dice, $budgetMs, $clock);

        $receipts = [];
        foreach ($clock->checkIns($replay, config('quezby.plausibility.checkpoints.marks_ms')) as ['reel' => $reel, 'atMs' => $atMs]) {
            // The request reaches the API a moment after the verdict that passed the mark.
            Carbon::setTestNow($at->addMilliseconds($clock->countdownMs() + $atMs + $dice->getInt(60, 400)));
            $receipts[] = $runs->checkpoint($user, $run->id, $reel, Checkpoint::prefixHash($actions, $reel));
        }

        $neededMs = $clock->needed($replay)[count($actions)];
        $finishedAt = $at->addMilliseconds($neededMs + $dice->getInt(1500, self::SLACK_MS));
        Carbon::setTestNow($finishedAt);
        $runs->finish($user, $run->id, $actions, $replay->summary->score, $replay->summary->reels, $receipts);

        return $finishedAt;
    }

    /**
     * The bot: plays reel by reel on its own engine, at the run's difficulty,
     * until the run is over, or until the next reel would not fit in
     * `$budgetMs` — then it quits. The
     * replay it hands back is what the app's pace (`RunClock`) times.
     *
     * @param  array{reaction: int, reactionSd: int, slip: float, reflex: float, holdSd: int, tapGap: int}  $thumb
     * @return array{0: list<array{int, int, int}>, 1: Replay}
     */
    private function play(int $seed, int $difficulty, array $thumb, Randomizer $dice, int $budgetMs, RunClock $clock): array
    {
        $pace = config('quezby.plausibility.pace');
        $engine = new Engine($seed, $difficulty);
        $actions = [];
        $steps = [];

        $boundMs = $clock->countdownMs();
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

        return [$actions, new Replay($engine->summary(), $steps)];
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
        $friendships = intdiv(DB::table('friendships')->whereIn('user_id', $users)->count(), 2);

        $this->command?->outputComponents()->info(sprintf(
            'Demo: %d players, %d runs (%d ranked, %d held for review), %d friendships, %d placed — %.1f s.',
            $users->count(),
            $runs->sum(),
            $runs[RunStatus::Ranked->value] ?? 0,
            $runs[RunStatus::Review->value] ?? 0,
            $friendships,
            DB::table('player_ratings')->whereIn('user_id', $users)->whereNotNull('rating')->count(),
            $seconds,
        ));
    }
}
