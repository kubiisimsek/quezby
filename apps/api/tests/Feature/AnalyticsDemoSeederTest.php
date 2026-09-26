<?php

use App\Models\User;
use Database\Seeders\AnalyticsDemoSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('the analytics demo refuses to run outside local', function (string $environment) {
    $this->app['env'] = $environment;
    User::factory()->withUsername()->create();

    expect(fn () => Artisan::call('db:seed', ['--class' => 'AnalyticsDemoSeeder', '--force' => true]))
        ->toThrow(RuntimeException::class, 'AnalyticsDemoSeeder only runs locally');
    expect(DB::table('analytics_visits')->count())->toBe(0);
})->with(['testing', 'staging', 'production']);

test('locally it fills analytics the way the app would, once', function () {
    $this->app['env'] = 'local';
    $now = Carbon::parse('2026-09-26 15:00', 'Europe/Istanbul');
    Carbon::setTestNow($now);
    $players = collect(range(0, 9))->map(fn (int $i) => User::factory()->withUsername("demo{$i}")->create([
        'created_at' => $now->copy()->subDays(40 - 2 * $i)->utc(),
        'platform' => $i % 3 === 0 ? 'android' : 'ios',
    ]));
    $this->app->instance(AnalyticsDemoSeeder::class, new AnalyticsDemoSeeder(days: 30));

    Artisan::call('db:seed', ['--class' => 'AnalyticsDemoSeeder']);

    expect(Artisan::output())->toContain('Demo analytics:')
        ->and(now()->equalTo($now))->toBeTrue();
    // Four in five said yes; every phone is in the registry, last seen on its latest visit.
    expect(User::query()->whereNotNull('analytics_at')->count())->toBe(8)
        ->and(DB::table('player_devices')->count())->toBe(10)
        ->and(DB::table('player_devices')->where('last_seen_at', '>=', now()->subDays(7)->utc()->format('Y-m-d H:i:s'))->count())->toBeGreaterThan(0)
        ->and(DB::table('analytics_visits')->count())->toBeGreaterThan(20)
        ->and(DB::table('analytics_visits')->whereIn('user_id', [$players[4]->id, $players[9]->id])->count())->toBe(0)
        ->and(DB::table('analytics_visits')->where('started_at', '>', now()->utc()->format('Y-m-d H:i:s'))->count())->toBe(0);
    // Players who joined inside the window started on their first day: the cohorts have them.
    expect((int) DB::table('analytics_totals')->where('bucket', 'age:0')->sum('total'))->toBeGreaterThan(0)
        ->and(DB::table('analytics_milestones')->where('milestone', 'tutorial_done')->count())->toBeGreaterThan(0);

    Artisan::call('db:seed', ['--class' => 'AnalyticsDemoSeeder']);
    expect(Artisan::output())->toContain('already here');
});
