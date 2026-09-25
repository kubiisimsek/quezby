<?php

use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\PlayerStat;
use App\Models\Run;
use App\Models\User;
use App\Support\Username;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('the demo seeder refuses to run outside local', function (string $environment) {
    $this->app['env'] = $environment;

    expect(fn () => Artisan::call('db:seed', ['--class' => 'DemoSeeder', '--force' => true]))
        ->toThrow(RuntimeException::class, 'DemoSeeder only runs locally');
    expect(User::query()->count())->toBe(0)
        ->and(Run::query()->count())->toBe(0);
})->with(['testing', 'staging', 'production']);

test('locally it plays runs onto every board the real way', function () {
    $this->app['env'] = 'local';
    $now = Carbon::parse('2026-09-24 15:00', 'Europe/Istanbul');
    Carbon::setTestNow($now);
    $this->app->instance(DemoSeeder::class, new DemoSeeder(players: 6, days: 2));

    Artisan::call('db:seed', ['--class' => 'DemoSeeder']);

    expect(Artisan::output())->toContain('Demo: 6 players')
        ->and(now()->equalTo($now))->toBeTrue();

    $players = User::query()->pluck('username', 'id');
    expect($players)->toHaveCount(6);
    foreach ($players as $username) {
        expect(Username::validate((string) $username)->ok)->toBeTrue();
    }

    // Every run was replayed and passed the anti-cheat: nothing flagged or refused.
    $runs = Run::query()->get();
    $yesterday = Carbon::parse('2026-09-23 00:00', 'Europe/Istanbul');
    foreach ($runs as $run) {
        expect($run->status)->toBeIn([RunStatus::Ranked, RunStatus::Review])
            ->and($run->started_at->greaterThanOrEqualTo($yesterday))->toBeTrue()
            ->and($run->finished_at->lessThanOrEqualTo($now))->toBeTrue()
            ->and($run->client_score)->toBe($run->score);
    }
    // The best player's metronome run waits for a moderator.
    $top = $players->search('burak07');
    expect($runs->where('status', RunStatus::Review)->pluck('user_id'))->toContain($top);

    // Everyone played today's challenge.
    expect($runs->where('mode', RunMode::Daily)->where('daily_key', '2026-09-24')->pluck('user_id')->unique())->toHaveCount(6);

    $ranked = $runs->where('status', RunStatus::Ranked)->where('score', '>', 0);
    $today = $ranked->filter(fn (Run $run) => $run->finished_at->greaterThanOrEqualTo(Carbon::parse('2026-09-24 00:00', 'Europe/Istanbul')));
    $boards = LeaderboardEntry::query()->toBase()
        ->selectRaw("period || ' ' || period_key as board, count(*) as players")
        ->groupBy('period', 'period_key')
        ->pluck('players', 'board')
        ->all();
    expect($boards['daily 2026-09-24'])->toBe($today->pluck('user_id')->unique()->count())->toBeGreaterThanOrEqual(5)
        ->and($boards['challenge 2026-09-24'])->toBe($today->where('mode', RunMode::Daily)->pluck('user_id')->unique()->count())->toBeGreaterThanOrEqual(5)
        ->and($boards['weekly 2026-W39'])->toBe($ranked->pluck('user_id')->unique()->count())
        ->and($boards['monthly 2026-09'])->toBe($boards['weekly 2026-W39'])
        ->and($boards['all all'])->toBe($boards['weekly 2026-W39']);

    // Casual to pro: the best player's season best is far above the first player's.
    $best = fn (string $username) => LeaderboardEntry::query()->where('period', 'all')->where('user_id', $players->search($username))->value('score');
    expect($best('burak07'))->toBeGreaterThan($best('ayse.nur'));

    // This week's league holds whoever has played the three counted runs that open it; the
    // lifetime numbers and follows are all filled.
    $opened = $ranked->groupBy('user_id')->filter(fn ($played) => $played->count() >= config('quezby.leagues.unlock_runs'));
    expect(LeagueGroup::query()->where('week_key', '2026-W39')->exists())->toBeTrue()
        ->and(LeagueMember::query()->where('week_key', '2026-W39')->pluck('user_id')->sort()->values()->all())
        ->toBe($opened->keys()->sort()->values()->all())
        ->and((int) PlayerStat::query()->sum('runs'))->toBe($runs->where('status', RunStatus::Ranked)->count())
        ->and(DB::table('follows')->count())->toBeGreaterThan(0)
        ->and(DB::table('follows')->whereNotIn('followee_id', $players->keys())->count())->toBe(0);
});

test('it seeds once', function () {
    $this->app['env'] = 'local';
    Carbon::setTestNow(Carbon::parse('2026-09-24 15:00', 'Europe/Istanbul'));
    $this->app->instance(DemoSeeder::class, new DemoSeeder(players: 2, days: 1));
    Artisan::call('db:seed', ['--class' => 'DemoSeeder']);
    $runs = Run::query()->count();

    Artisan::call('db:seed', ['--class' => 'DemoSeeder']);

    expect(Artisan::output())->toContain('already here')
        ->and(User::query()->count())->toBe(2)
        ->and(Run::query()->count())->toBe($runs);
});

test('just after midnight it still only plays today, and only in the past', function () {
    $this->app['env'] = 'local';
    $now = Carbon::parse('2026-09-24 00:04', 'Europe/Istanbul');
    Carbon::setTestNow($now);
    $this->app->instance(DemoSeeder::class, new DemoSeeder(players: 3, days: 1));

    Artisan::call('db:seed', ['--class' => 'DemoSeeder']);

    $runs = Run::query()->get();
    $midnight = Carbon::parse('2026-09-24 00:00', 'Europe/Istanbul');
    expect($runs)->not->toBeEmpty();
    foreach ($runs as $run) {
        expect($run->daily_key ?? '2026-09-24')->toBe('2026-09-24')
            ->and($run->started_at->greaterThanOrEqualTo($midnight))->toBeTrue()
            ->and($run->finished_at->lessThanOrEqualTo($now))->toBeTrue();
    }
    expect(LeaderboardEntry::query()->where('period', 'challenge')->where('period_key', '2026-09-24')->count())->toBeGreaterThan(0);
});
