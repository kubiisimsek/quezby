<?php

use App\Models\Run;
use App\Models\User;
use App\Services\Admin\DaySeries;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| Counting by the game's day: Istanbul midnight (21:00 UTC) turns it, in any
| database.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

test('lists the last days oldest first, each with its UTC bounds', function () {
    $days = app(DaySeries::class)->days(3);

    expect(array_column($days, 'key'))->toBe(['2026-09-23', '2026-09-24', '2026-09-25'])
        ->and($days[2]['start']->toIso8601String())->toBe('2026-09-24T21:00:00+00:00')
        ->and($days[2]['end']->toIso8601String())->toBe('2026-09-25T21:00:00+00:00');
});

test('puts a row on the day Istanbul says, to the millisecond', function () {
    $series = app(DaySeries::class);
    User::factory()->create(['created_at' => Carbon::parse('2026-09-24 20:59:59', 'UTC')]);
    User::factory()->create(['created_at' => Carbon::parse('2026-09-24 21:00:00', 'UTC')]);
    User::factory()->create(['created_at' => Carbon::parse('2026-09-25 10:00:00', 'UTC')]);
    User::factory()->create(['created_at' => Carbon::parse('2026-09-20 10:00:00', 'UTC')]);

    expect($series->count(DB::table('users'), 'created_at', (new User)->getDateFormat(), $series->days(3)))->toBe([0, 1, 2]);
});

test('counts different values when asked — players, not runs', function () {
    $series = app(DaySeries::class);
    $player = User::factory()->create();
    Run::factory()->for($player)->ranked(1)->create(['finished_at' => Carbon::parse('2026-09-24 20:59:59.999', 'UTC')]);
    Run::factory()->for($player)->ranked(1)->create(['finished_at' => Carbon::parse('2026-09-24 21:00:00.000', 'UTC')]);
    Run::factory()->for($player)->ranked(1)->create(['finished_at' => Carbon::parse('2026-09-25 05:00:00.000', 'UTC')]);
    $format = (new Run)->getDateFormat();

    expect($series->count(DB::table('runs'), 'finished_at', $format, $series->days(2)))->toBe([1, 2])
        ->and($series->count(DB::table('runs'), 'finished_at', $format, $series->days(2), 'user_id'))->toBe([1, 1]);
});

test('counts nothing for no days', function () {
    expect(app(DaySeries::class)->count(DB::table('users'), 'created_at', 'Y-m-d H:i:s', []))->toBe([]);
});
