<?php

use App\Content\Catalog;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\LeagueMember;
use App\Models\PlayerStat;
use App\Models\Run;
use App\Models\User;
use App\Services\RunService;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

/**
 * Plays a run through `RunService` the way the API does, with `playedLog`'s
 * metronome thumb — every decision at 400 ms. On an open board that is a top
 * score with a soft warning: held for review.
 */
function moderationCommandsRun(User $player, int $reels = 100): Run
{
    $runs = app(RunService::class);
    $run = $runs->start($player, RunMode::Free, Rules::ENGINE_VERSION, Catalog::LATEST, null);
    $actions = playedLog($run->seed, $reels, 400);
    $summary = Engine::replay($run->seed, $actions)->summary;
    Carbon::setTestNow(now()->addMinutes(10));

    return $runs->finish($player, $run->id, $actions, $summary->score, $summary->reels)->run;
}

/**
 * @return array<string, int>
 */
function moderationCommandsRows(User $player): array
{
    return LeaderboardEntry::query()->where('user_id', $player->id)->get()
        ->mapWithKeys(fn (LeaderboardEntry $entry) => [$entry->period->value.' '.$entry->period_key => $entry->score])
        ->sortKeys()
        ->all();
}

test('quezby:review lists the held runs, best first', function () {
    $low = moderationCommandsRun(User::factory()->withUsername('dusuk')->create(), 80);
    $high = moderationCommandsRun(User::factory()->withUsername('yuksek')->create(), 140);
    expect([$low->status, $high->status])->toBe([RunStatus::Review, RunStatus::Review])
        ->and($high->score)->toBeGreaterThan($low->score);
    $row = fn (Run $run, string $username) => [
        $run->id,
        $username,
        number_format($run->score, 0, ',', '.'),
        $run->reels,
        implode(', ', array_column($run->flags, 'code')),
        $run->finished_at->copy()->setTimezone('Europe/Istanbul')->format('Y-m-d H:i'),
    ];

    $this->artisan('quezby:review')
        ->expectsTable(
            ['Run', 'Player', 'Score', 'Reels', 'Signals', 'Finished (Europe/Istanbul)'],
            [$row($high, 'yuksek'), $row($low, 'dusuk')],
        )
        ->assertSuccessful();
});

test('quezby:review with nothing held', function () {
    $this->recordRanked(User::factory()->withUsername()->create(), 5000);

    $this->artisan('quezby:review')->expectsOutputToContain('No runs are waiting for review.')->assertSuccessful();
});

test('approving a held run puts it on the boards of the day it was played', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $run = moderationCommandsRun($player);
    expect($run->status)->toBe(RunStatus::Review)
        ->and(LeaderboardEntry::query()->count())->toBe(0)
        ->and(PlayerStat::query()->find($player->id))->toBeNull();
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));

    $this->artisan('quezby:run:approve', ['run' => strtoupper($run->id)])
        ->expectsOutputToContain("Run {$run->id} by kerem.35 is ranked")
        ->assertSuccessful();

    expect($run->fresh()->status)->toBe(RunStatus::Ranked)
        ->and(moderationCommandsRows($player))->toBe([
            'all all' => $run->score,
            'daily 2026-09-24' => $run->score,
            'monthly 2026-09' => $run->score,
            'weekly 2026-W39' => $run->score,
        ])
        ->and(LeagueMember::query()->where('user_id', $player->id)->value('week_key'))->toBe('2026-W39')
        ->and(PlayerStat::query()->find($player->id)->runs)->toBe(1);
});

test('only a held run can be approved', function () {
    $ranked = $this->recordRanked(User::factory()->withUsername()->create(), 5000);

    $this->artisan('quezby:run:approve', ['run' => $ranked->id])
        ->expectsOutputToContain("Run {$ranked->id} is not waiting for review: it is ranked.")
        ->assertFailed();
    $this->artisan('quezby:run:approve', ['run' => '01jzzzzzzzzzzzzzzzzzzzzzzz'])
        ->expectsOutputToContain('There is no run 01jzzzzzzzzzzzzzzzzzzzzzzz.')
        ->assertFailed();
});

test("rejecting a run rebuilds its player's boards from the runs they have left", function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul'));
    $this->recordRanked($player, 3000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $cheated = $this->recordRanked($player, 9000);

    $this->artisan('quezby:run:reject', ['run' => $cheated->id, '--reason' => 'Bot gibi oynuyor'])
        ->expectsOutputToContain("kerem.35's boards were rebuilt")
        ->assertSuccessful();

    $cheated->refresh();
    expect($cheated->status)->toBe(RunStatus::Rejected)
        ->and($cheated->flags)->toBe([['code' => 'moderator', 'reason' => 'Bot gibi oynuyor', 'severity' => 'hard']])
        ->and(moderationCommandsRows($player))->toBe([
            'all all' => 3000,
            'daily 2026-09-23' => 3000,
            'monthly 2026-09' => 3000,
            'weekly 2026-W39' => 3000,
        ]);
});

test('a held run can be rejected too, keeping its signals', function () {
    $run = moderationCommandsRun(User::factory()->withUsername()->create());

    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => 'Metronom'])->assertSuccessful();

    $run->refresh();
    $codes = array_column($run->flags, 'code');
    expect($run->status)->toBe(RunStatus::Rejected)
        ->and($codes[0])->toBe('reaction_cv')
        ->and(end($codes))->toBe('moderator');
});

test('a rejection needs a reason, a run and a run that can be rejected', function () {
    $run = $this->recordRanked(User::factory()->withUsername()->create(), 5000);

    $this->artisan('quezby:run:reject', ['run' => $run->id])
        ->expectsOutputToContain('Say why: --reason="…"')
        ->assertFailed();
    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => '   '])->assertFailed();
    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => str_repeat('x', 192)])
        ->expectsOutputToContain('at most 191 characters')
        ->assertFailed();
    expect($run->fresh()->status)->toBe(RunStatus::Ranked);

    $this->artisan('quezby:run:reject', ['run' => '01jzzzzzzzzzzzzzzzzzzzzzzz', '--reason' => 'Hile'])
        ->expectsOutputToContain('There is no run')
        ->assertFailed();

    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => 'Hile'])->assertSuccessful();
    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => 'Hile'])
        ->expectsOutputToContain('cannot be rejected: it is rejected')
        ->assertFailed();
});

test('a ban takes the player off every board and flags every later run', function () {
    $player = User::factory()->withUsername('hileci')->create();
    $this->recordRanked($player, 5000);

    $this->artisan('quezby:user:ban', ['username' => ' Hileci ', '--reason' => 'Hız hilesi'])
        ->expectsOutputToContain('hileci is banned')
        ->assertSuccessful();

    $player->refresh();
    expect($player->isBanned())->toBeTrue()
        ->and($player->ban_reason)->toBe('Hız hilesi')
        ->and(moderationCommandsRows($player))->toBe([]);

    $later = moderationCommandsRun($player);
    expect($later->status)->toBe(RunStatus::Flagged)
        ->and(array_column($later->flags, 'code'))->toContain('banned')
        ->and(moderationCommandsRows($player))->toBe([]);
});

test('a ban needs a reason and a player', function () {
    User::factory()->withUsername('hileci')->create();

    $this->artisan('quezby:user:ban', ['username' => 'hileci'])->expectsOutputToContain('Say why')->assertFailed();
    $this->artisan('quezby:user:ban', ['username' => 'kimse.yok', '--reason' => 'Hile'])
        ->expectsOutputToContain('There is no player called kimse.yok.')
        ->assertFailed();
    expect(User::query()->whereNotNull('banned_at')->count())->toBe(0);
});

test('banning a banned player changes nothing', function () {
    $player = User::factory()->withUsername('hileci')->create(['banned_at' => now()->subDay(), 'ban_reason' => 'İlk sebep']);

    $this->artisan('quezby:user:ban', ['username' => 'hileci', '--reason' => 'İkinci sebep'])
        ->expectsOutputToContain('nothing changed')
        ->assertSuccessful();

    expect($player->fresh()->ban_reason)->toBe('İlk sebep');
});

test("unbanning puts the player's ranked runs back on the boards", function () {
    $player = User::factory()->withUsername('affedilen')->create();
    $this->recordRanked($player, 5000);
    $this->artisan('quezby:user:ban', ['username' => 'affedilen', '--reason' => 'Yanlışlıkla'])->assertSuccessful();

    $this->artisan('quezby:user:unban', ['username' => 'affedilen'])
        ->expectsOutputToContain('affedilen is unbanned')
        ->assertSuccessful();

    $player->refresh();
    expect($player->isBanned())->toBeFalse()
        ->and($player->ban_reason)->toBeNull()
        ->and(moderationCommandsRows($player))->toBe([
            'all all' => 5000,
            'daily 2026-09-24' => 5000,
            'monthly 2026-09' => 5000,
            'weekly 2026-W39' => 5000,
        ]);
});

test('unbanning needs a banned player', function () {
    User::factory()->withUsername('temiz')->create();

    $this->artisan('quezby:user:unban', ['username' => 'kimse.yok'])
        ->expectsOutputToContain('There is no player called kimse.yok.')
        ->assertFailed();
    $this->artisan('quezby:user:unban', ['username' => 'temiz'])
        ->expectsOutputToContain('temiz is not banned; nothing changed.')
        ->assertSuccessful();
});

test('quezby:runs:expire closes the runs left open past their time', function () {
    $open = fn (int $minutesAgo) => tap(Run::factory()->create(['started_at' => now()->subMinutes($minutesAgo)]), function (Run $run) {
        $run->forceFill(['open_user_id' => $run->user_id])->save();
    });
    $stale = $open(121);
    $older = $open(60 * 24);
    $fresh = $open(30);
    $finished = Run::factory()->ranked(4000)->create(['started_at' => now()->subDay()]);

    $this->artisan('quezby:runs:expire')
        ->expectsOutputToContain('Expired 2 runs started more than 120 minutes ago.')
        ->assertSuccessful();

    foreach ([$stale, $older] as $run) {
        $run->refresh();
        expect($run->status)->toBe(RunStatus::Expired)->and($run->open_user_id)->toBeNull();
    }
    expect($fresh->fresh()->status)->toBe(RunStatus::Started)
        ->and($fresh->fresh()->open_user_id)->toBe($fresh->user_id)
        ->and($finished->fresh()->status)->toBe(RunStatus::Ranked);

    $this->artisan('quezby:runs:expire')->expectsOutputToContain('Expired 0 runs')->assertSuccessful();
});
