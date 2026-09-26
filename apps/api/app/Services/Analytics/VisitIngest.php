<?php

namespace App\Services\Analytics;

use App\Enums\AnalyticsEvent;
use App\Enums\AnalyticsScreen;
use App\Models\User;
use App\Services\Devices\DeviceRegistry;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Takes the visits a phone summed up (`POST /analytics/visits`). One row per
 * visit, never per tap; its counts go straight into the day's totals.
 *
 * Every visit on its own and outside any transaction: on MySQL an
 * `INSERT IGNORE` holds its lock until commit, and two batches that then
 * add to the same busy total would deadlock. The visit row goes in first —
 * it is the key that makes a visit sent twice count once — so a failure
 * half-way can lose a count but never add one twice.
 */
final class VisitIngest
{
    public function __construct(
        private readonly Analytics $analytics,
        private readonly Days $days,
        private readonly Totals $totals,
        private readonly Upkeep $upkeep,
        #[Config('quezby.analytics.limits.max_age_days')]
        private readonly int $maxAgeDays,
        #[Config('quezby.analytics.limits.max_visit_seconds')]
        private readonly int $maxVisitSeconds,
        #[Config('quezby.analytics.visits_per_day')]
        private readonly int $visitsPerDay,
    ) {}

    /**
     * @param  array{sentAt: string, platform: string, visits: list<array{id: string, startedAt: string, seconds: int, appVersion?: string|null, journey: list<array{0: string, 1: int}>, counts: array<string, int>}>}  $batch
     * @return bool Whether the app should go on recording: false when nothing of this player is kept.
     */
    public function store(User $user, array $batch): bool
    {
        if (! $this->analytics->collects($user)) {
            return false;
        }

        $now = CarbonImmutable::now();
        $offset = $this->clockOffset($batch['sentAt'], $now);
        $dropped = 0;
        foreach ($batch['visits'] as $visit) {
            try {
                $dropped += $this->storeOne($user, $visit, $batch['platform'], $offset, $now);
            } catch (Throwable $e) {
                report($e);
            }
        }

        if ($dropped > 0) {
            $this->totals->add($this->analytics->today(), ['dropped' => $dropped]);
        }
        $this->upkeep->tick();

        return true;
    }

    /**
     * @param  array{id: string, startedAt: string, seconds: int, appVersion?: string|null, journey: list<array{0: string, 1: int}>, counts: array<string, int>}  $visit
     * @return int What was turned away: the visit, or the codes this API does not know.
     */
    private function storeOne(User $user, array $visit, string $platform, int $offsetSeconds, CarbonImmutable $now): int
    {
        $started = CarbonImmutable::parse($visit['startedAt'])->utc()->addSeconds($offsetSeconds);
        if ($started->lt($now->subDays($this->maxAgeDays + 1)) || $started->gt($now->addMinutes(5))) {
            return 1;
        }

        // A visit that began on the welcome screen, before the account, is its first day's.
        $day = max($this->analytics->dayOf($started), $this->analytics->cohortOf($user));
        if ($this->days->visitsOn($user, $day) >= $this->visitsPerDay) {
            return 1;
        }

        [$journey, $strangeSteps] = $this->journey($visit['journey']);
        [$buckets, $milestones, $strangeCounts] = $this->counts($visit['counts']);
        $seconds = max(0, min((int) $visit['seconds'], $this->maxVisitSeconds, $started->diffInSeconds($now, true) + 60));
        $version = DeviceRegistry::version($visit['appVersion'] ?? null);

        $inserted = DB::table('analytics_visits')->insertOrIgnore([
            'user_id' => $user->id,
            'client_id' => $visit['id'],
            'day' => $day,
            'started_at' => $started->format('Y-m-d H:i:s'),
            'seconds' => (int) $seconds,
            'platform' => $platform,
            'app_version' => $version,
            'journey' => json_encode($journey, JSON_THROW_ON_ERROR),
            'created_at' => $now->format('Y-m-d H:i:s'),
        ]);
        if ($inserted === 0) {
            return 0;
        }

        $this->days->touch($user, $day, $platform, $version);
        $this->days->addVisit($user, $day, (int) $seconds, $platform, $version);
        $this->totals->add($day, ['visits' => 1, 'seconds' => (int) $seconds, ...$buckets]);
        $this->reach($user, $milestones, $journey, $started);

        return $strangeSteps + $strangeCounts;
    }

    /**
     * The steps this API knows, in order.
     *
     * @param  list<array{0: string, 1: int}>  $steps
     * @return array{0: list<array{0: string, 1: int}>, 1: int}
     */
    private function journey(array $steps): array
    {
        $known = [];
        $strange = 0;
        foreach ($steps as [$code, $at]) {
            if (AnalyticsScreen::tryFrom($code) === null && AnalyticsEvent::tryFrom($code) === null) {
                $strange++;

                continue;
            }
            $known[] = [$code, max(0, (int) $at)];
        }

        return [$known, $strange];
    }

    /**
     * The totals the counts add to, the milestones among them, and the codes this API does not know.
     *
     * @param  array<string, int>  $counts
     * @return array{0: array<string, int>, 1: list<AnalyticsEvent>, 2: int}
     */
    private function counts(array $counts): array
    {
        $buckets = [];
        $milestones = [];
        $strange = 0;
        foreach ($counts as $code => $count) {
            $count = (int) $count;
            if ($count <= 0) {
                continue;
            }
            $screen = AnalyticsScreen::tryFrom((string) $code);
            $event = AnalyticsEvent::tryFrom((string) $code);
            if ($screen !== null) {
                $buckets[$screen->bucket()] = $count;
            } elseif ($event !== null) {
                $buckets[$event->bucket()] = $count;
                if ($event->isMilestone()) {
                    $milestones[] = $event;
                }
            } else {
                $strange++;
            }
        }

        return [$buckets, $milestones, $strange];
    }

    /**
     * A player's firsts, at the moment of the step that shows them — kept once.
     *
     * @param  list<AnalyticsEvent>  $milestones
     * @param  list<array{0: string, 1: int}>  $journey
     */
    private function reach(User $user, array $milestones, array $journey, CarbonImmutable $started): void
    {
        foreach ($milestones as $milestone) {
            $step = collect($journey)->first(fn (array $step) => $step[0] === $milestone->value);
            $at = $started->addSeconds($step === null ? 0 : $step[1]);
            DB::table('analytics_milestones')->insertOrIgnore([
                'user_id' => $user->id,
                'milestone' => $milestone->value,
                'at' => $at->format('Y-m-d H:i:s'),
            ]);
        }
    }

    /**
     * How far the phone's clock is behind the API's, in seconds — what every
     * `startedAt` moves by. `sentAt` is stamped as the request leaves, so a
     * request held back by the network only shows as a little skew; more than
     * a week of it is a broken clock, not worth trusting.
     */
    private function clockOffset(string $sentAt, CarbonInterface $now): int
    {
        try {
            $offset = (int) round(CarbonImmutable::parse($sentAt)->diffInSeconds($now, false));
        } catch (Throwable) {
            return 0;
        }

        return abs($offset) > 7 * 86_400 ? 0 : $offset;
    }
}
