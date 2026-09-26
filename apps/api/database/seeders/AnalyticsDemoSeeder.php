<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Analytics\VisitIngest;
use App\Services\Devices\DeviceRegistry;
use App\Support\DeviceHeader;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Random\Engine\Xoshiro256StarStar;
use Random\Randomizer;
use RuntimeException;

/**
 * Local demo analytics, written the real way: four players in five say yes
 * on the day they joined, and from then on — up to `$days` Istanbul days
 * back — they open the app now and then. Every visit goes through
 * `VisitIngest` with the clock moved to its end, and every phone through the
 * `DeviceRegistry`, so the totals, days, cohorts and firsts fill exactly as
 * the app would fill them. The fifth player never says yes: only their phone
 * is in the registry.
 *
 *     php artisan db:seed --class=AnalyticsDemoSeeder
 *
 * Local only. Needs players (`DemoSeeder` calls it at its end); does nothing
 * once there are visits.
 */
final class AnalyticsDemoSeeder extends Seeder
{
    private const IOS = [['iPhone 15 Pro', '18.2'], ['iPhone 14', '18.1'], ['iPhone 13', '17.6.1'], ['iPhone 16', '18.3']];

    private const ANDROID = [['Pixel 8', '14'], ['Galaxy S23', '14'], ['Redmi Note 12', '13'], ['Galaxy A54', '15']];

    private const WANDER = ['leaderboard', 'league', 'daily', 'search', 'profile', 'help'];

    public function __construct(
        /** Istanbul days back from today to fill, today included. */
        public int $days = 60,
    ) {}

    public function run(VisitIngest $visits, DeviceRegistry $devices): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('AnalyticsDemoSeeder only runs locally (APP_ENV=local): it makes up how players use the app.');
        }
        if (DB::table('analytics_visits')->exists()) {
            $this->command?->outputComponents()->warn('Demo analytics are already here; nothing to do.');

            return;
        }
        $players = User::query()->whereNull('banned_at')->orderBy('created_at')->orderBy('id')->get();
        if ($players->isEmpty()) {
            $this->command?->outputComponents()->warn('No players yet: run DemoSeeder first.');

            return;
        }

        $testNow = Carbon::getTestNow();
        $now = CarbonImmutable::now('UTC');
        $timezone = (string) config('quezby.leaderboard.timezone');
        $first = $now->setTimezone($timezone)->startOfDay()->subDays(max(1, $this->days) - 1);
        $sent = 0;

        try {
            foreach ($players->values() as $index => $player) {
                $dice = new Randomizer(new Xoshiro256StarStar(crc32('analytics|'.$player->id)));
                $device = $this->phoneOf($player, $dice);
                $joined = $player->created_at->toImmutable()->utc();
                $from = $joined->greaterThan($first) ? $joined->setTimezone($timezone)->startOfDay() : $first;

                Carbon::setTestNow($joined->greaterThan($first) ? $joined : $first->utc());
                $devices->seen($player, $device, '1.0.0');

                if ($index % 5 === 4) {
                    continue;
                }
                $player->forceFill(['analytics_at' => $joined->greaterThan($first) ? $joined : $first->utc()])->save();

                // Better players — later in the list — come back more often.
                $loyalty = 0.25 + 0.6 * ($index % 7) / 6;
                for ($day = $from; $day->lessThanOrEqualTo($now); $day = $day->addDay()) {
                    $isFirst = $day->equalTo($from) && $joined->greaterThan($first);
                    if (! $isFirst && $dice->nextFloat() >= $loyalty) {
                        continue;
                    }
                    $count = $isFirst ? 1 : $dice->getInt(1, 3);
                    for ($visit = 0; $visit < $count; $visit++) {
                        $start = $isFirst ? $joined->addMinute() : $day->addMinutes($dice->getInt(8 * 60, 23 * 60 + 30))->utc();
                        $journey = $isFirst ? $this->firstVisit($dice) : $this->visit($dice);
                        $seconds = $journey[count($journey) - 1][1] + $dice->getInt(20, 90);
                        $end = $start->addSeconds($seconds);
                        if ($end->greaterThan($now)) {
                            break;
                        }

                        Carbon::setTestNow($end);
                        // The app names the phone with every call: the registry sees it that day too.
                        $devices->seen($player, $device, '1.0.0');
                        $visits->store($player, [
                            'sentAt' => $end->format('Y-m-d\TH:i:s.v\Z'),
                            'platform' => $device->platform?->value ?? 'ios',
                            'visits' => [[
                                'id' => bin2hex($dice->getBytes(16)),
                                'startedAt' => $start->format('Y-m-d\TH:i:s.v\Z'),
                                'seconds' => $seconds,
                                'appVersion' => '1.0.0',
                                'journey' => $journey,
                                'counts' => $this->counts($journey),
                            ]],
                        ]);
                        $sent++;
                    }
                }
            }
        } finally {
            Carbon::setTestNow($testNow);
        }

        $this->command?->outputComponents()->info(sprintf(
            'Demo analytics: %d visits from %d players who said yes, %d phones.',
            $sent,
            User::query()->whereNotNull('analytics_at')->count(),
            DB::table('player_devices')->count(),
        ));
    }

    private function phoneOf(User $player, Randomizer $dice): DeviceHeader
    {
        $android = $player->platform === 'android';
        [$model, $os] = ($android ? self::ANDROID : self::IOS)[$dice->getInt(0, 3)];
        $install = preg_replace('/[^A-Za-z0-9-]/', '-', (string) ($player->install_id ?: 'demo-'.$player->id));

        return DeviceHeader::parse(sprintf(
            'install=%s; platform=%s; os=%s; model=%s; build=42',
            str_pad((string) $install, 8, '0'),
            $android ? 'android' : 'ios',
            rawurlencode($os),
            rawurlencode($model),
        )) ?? throw new RuntimeException('A demo phone the registry would not take.');
    }

    /**
     * A new player's first visit: the welcome, the practice run, a name, a way to keep the account, the lobby.
     *
     * @return list<array{0: string, 1: int}>
     */
    private function firstVisit(Randomizer $dice): array
    {
        $at = 0;
        $journey = [['welcome', $at]];
        $journey[] = ['tutorial', $at += $dice->getInt(4, 15)];
        if ($dice->nextFloat() < 0.85) {
            $journey[] = ['tutorial_done', $at += $dice->getInt(70, 180)];
            $journey[] = ['username', $at += 3];
            if ($dice->nextFloat() < 0.4) {
                $journey[] = ['nickname_skip', $at += $dice->getInt(2, 8)];
            }
            $journey[] = ['protect', $at += $dice->getInt(5, 20)];
            if ($dice->nextFloat() < 0.6) {
                $journey[] = ['protect_skip', $at += $dice->getInt(2, 6)];
            }
            $journey[] = ['home', $at += 2];
            $journey[] = ['game', $at += $dice->getInt(5, 30)];
        }

        return $journey;
    }

    /**
     * A later visit: the lobby, a run or two, and a look around.
     *
     * @return list<array{0: string, 1: int}>
     */
    private function visit(Randomizer $dice): array
    {
        $at = 0;
        $journey = [['home', $at]];
        for ($run = $dice->getInt(1, 3); $run > 0; $run--) {
            if ($dice->nextFloat() < 0.15) {
                $journey[] = ['rival', $at += $dice->getInt(3, 12)];
            }
            $journey[] = ['game', $at += $dice->getInt(3, 20)];
            $at += $dice->getInt(90, 330);
            if ($dice->nextFloat() < 0.2) {
                $journey[] = ['share_result', $at += 4];
            }
            $journey[] = [self::WANDER[$dice->getInt(0, count(self::WANDER) - 1)], $at += $dice->getInt(3, 10)];
            if ($journey[count($journey) - 1][0] === 'search' && $dice->nextFloat() < 0.5) {
                $journey[] = ['player_card', $at += $dice->getInt(5, 25)];
            }
            $journey[] = ['home', $at += $dice->getInt(10, 40)];
        }

        return array_slice($journey, 0, 40);
    }

    /**
     * @param  list<array{0: string, 1: int}>  $journey
     * @return array<string, int>
     */
    private function counts(array $journey): array
    {
        $counts = [];
        foreach ($journey as [$code]) {
            $counts[$code] = ($counts[$code] ?? 0) + 1;
        }

        return $counts;
    }
}
