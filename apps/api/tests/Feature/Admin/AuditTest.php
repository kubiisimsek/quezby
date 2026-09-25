<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Models\Admin;
use App\Models\AuditEntry;
use App\Models\User;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

/**
 * @param  array<string, string|int>  $query
 */
function adminAuditList(array $query = []): TestResponse
{
    return test()->getJson('/api/v1/admin/audit?'.http_build_query($query));
}

function adminAuditPanel(Admin $admin): Actor
{
    return Actor::panel($admin, Request::create('/', server: ['REMOTE_ADDR' => '10.0.0.9']));
}

test('lists the audit log newest first, a page at a time', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername('hileci')->create();
    $log = app(AuditLog::class);
    $log->record(Actor::cli(), AuditAction::PlayerBan, $player, 'Bot');
    Carbon::setTestNow(now()->addMinute());
    $log->record(Actor::cli(), AuditAction::PlayerUnban, $player);

    adminAuditList(['perPage' => 1])
        ->assertOk()
        ->assertJsonPath('total', 2)
        ->assertJsonPath('items.0.action', 'player.unban')
        ->assertJsonPath('items.0.via', 'cli')
        ->assertJsonPath('items.0.actor', ['id' => null, 'name' => 'Komut satırı'])
        ->assertJsonPath('items.0.subject', ['type' => 'player', 'id' => $player->id, 'label' => 'hileci'])
        ->assertJsonPath('items.0.at', '2026-09-25T09:01:00.000Z');
});

test('filters by action, channel, admin and subject', function () {
    $owner = $this->signInAdmin(AdminRole::Owner);
    $other = Admin::factory()->moderator()->create();
    $player = User::factory()->withUsername('hileci')->create();
    $someone = User::factory()->withUsername('baska')->create();
    $log = app(AuditLog::class);
    $log->record(adminAuditPanel($other), AuditAction::PlayerBan, $player, 'Bot');
    $log->record(Actor::cli(), AuditAction::PlayerRename, $someone, 'Ad');
    $log->record(adminAuditPanel($owner), AuditAction::Login, $owner);

    adminAuditList(['action' => 'player.ban'])->assertJsonPath('items.*.subject.label', ['hileci']);
    adminAuditList(['via' => 'cli'])->assertJsonPath('items.*.action', ['player.rename']);
    adminAuditList(['admin' => $other->id])->assertJsonPath('items.*.action', ['player.ban']);
    adminAuditList(['subjectType' => 'player', 'subjectId' => $someone->id])->assertJsonPath('items.*.action', ['player.rename']);
    adminAuditList(['subjectType' => 'admin'])->assertJsonPath('items.*.action', ['auth.login']);
});

test('only an owner sees where an action came from', function (AdminRole $role, ?string $ip) {
    $this->signInAdmin($role);
    app(AuditLog::class)->record(adminAuditPanel(Admin::factory()->create()), AuditAction::PlayerBan, User::factory()->withUsername('x1')->create(), 'Bot');

    adminAuditList()->assertJsonPath('items.0.ip', $ip);
})->with([
    'an owner' => [AdminRole::Owner, '10.0.0.9'],
    'a viewer' => [AdminRole::Viewer, null],
]);

test('refuses a filter it does not know', function (array $query, string $field) {
    $this->signInAdmin(AdminRole::Viewer);

    $this->assertApiError(adminAuditList($query), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    [['action' => 'player.eat'], 'action'],
    [['via' => 'telepathy'], 'via'],
    [['admin' => 'not-a-ulid'], 'admin'],
    [['subjectType' => 'league'], 'subjectType'],
]);

test('the audit log can only grow', function () {
    $entry = app(AuditLog::class)->record(Actor::cli(), AuditAction::PlayerBan, User::factory()->withUsername('x1')->create(), 'Bot');

    expect(fn () => $entry->update(['reason' => 'Başka']))->toThrow(LogicException::class)
        ->and(fn () => $entry->delete())->toThrow(LogicException::class)
        ->and(AuditEntry::query()->sole()->reason)->toBe('Bot');
});
