<?php

use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Enums\RunStatus;
use App\Models\AuditEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;

/*
| Every moderation decision is on record, whichever door it came through —
| the admin panel, `php artisan` or `POST /ops/moderate`.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

test('the artisan commands put their decisions on record as the command line', function () {
    $player = User::factory()->withUsername('hileci')->create();
    $run = $this->recordRanked($player, 8000);

    $this->artisan('quezby:run:reject', ['run' => $run->id, '--reason' => 'Bot gibi'])->assertSuccessful();
    $this->artisan('quezby:user:ban', ['username' => 'hileci', '--reason' => 'Bot'])->assertSuccessful();
    $this->artisan('quezby:user:unban', ['username' => 'hileci'])->assertSuccessful();

    $entries = AuditEntry::query()->orderBy('id')->get();
    expect($entries->pluck('action')->all())->toBe([AuditAction::RunReject, AuditAction::PlayerBan, AuditAction::PlayerUnban])
        ->and($entries->pluck('via')->unique()->all())->toBe([AuditVia::Cli])
        ->and($entries->pluck('actor_label')->unique()->all())->toBe(['Komut satırı'])
        ->and($entries[0]->subject_type)->toBe('run')
        ->and($entries[0]->subject_label)->toBe('hileci')
        ->and($entries[0]->reason)->toBe('Bot gibi')
        ->and($entries[0]->details)->toBe(['was' => 'ranked', 'score' => 8000])
        ->and($entries[1]->reason)->toBe('Bot');
});

test('the ops route puts its decisions on record with the caller\'s address', function () {
    config(['quezby.moderation_token' => 'a-long-random-moderation-token']);
    User::factory()->withUsername('hileci')->create();

    $this->postJson('/api/v1/ops/moderate', ['action' => 'ban', 'username' => 'hileci', 'reason' => 'Bot'], ['X-Moderation-Token' => 'a-long-random-moderation-token'])
        ->assertOk();

    $entry = AuditEntry::query()->sole();
    expect($entry->via)->toBe(AuditVia::Ops)
        ->and($entry->action)->toBe(AuditAction::PlayerBan)
        ->and($entry->ip)->toBe('127.0.0.1')
        ->and($entry->admin_id)->toBeNull();
});

test('a decision that changes nothing leaves no record', function () {
    $player = User::factory()->withUsername('temiz')->create();
    $started = Run::factory()->for($player)->create(['status' => RunStatus::Started]);

    $this->artisan('quezby:user:unban', ['username' => 'temiz'])->assertSuccessful();
    $this->artisan('quezby:run:reject', ['run' => $started->id, '--reason' => 'Olmaz'])->assertFailed();

    expect(AuditEntry::query()->count())->toBe(0);
});
