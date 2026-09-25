<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Models\AuditEntry;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\Identity\GuestNames;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

/**
 * @param  array<string, mixed>  $body
 */
function adminPlayerAction(User $player, string $action, array $body = []): TestResponse
{
    return test()->postJson("/api/v1/admin/players/{$player->id}/{$action}", $body);
}

test('a moderator bans a player: off every board, and the reason is on record', function () {
    $moderator = $this->signInAdmin(AdminRole::Moderator, ['name' => 'Ekin']);
    $player = User::factory()->withUsername('hileci')->create();
    $this->recordRanked($player, 5000);

    adminPlayerAction($player, 'ban', ['reason' => 'Hız hilesi'])->assertOk()->assertExactJson(['changed' => true]);

    expect($player->fresh()->isBanned())->toBeTrue()
        ->and($player->fresh()->ban_reason)->toBe('Hız hilesi')
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->count())->toBe(0);

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::PlayerBan)
        ->and($entry->via)->toBe(AuditVia::Panel)
        ->and($entry->admin_id)->toBe($moderator->id)
        ->and($entry->actor_label)->toBe('Ekin')
        ->and($entry->subject_id)->toBe($player->id)
        ->and($entry->subject_label)->toBe('hileci')
        ->and($entry->reason)->toBe('Hız hilesi');
});

test('banning a banned player changes nothing and records nothing', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('hileci')->create(['banned_at' => now()->subDay(), 'ban_reason' => 'İlk sebep']);

    adminPlayerAction($player, 'ban', ['reason' => 'İkinci sebep'])->assertOk()->assertExactJson(['changed' => false]);

    expect($player->fresh()->ban_reason)->toBe('İlk sebep')
        ->and(AuditEntry::query()->count())->toBe(0);
});

test('unbanning puts the player\'s ranked runs back on the boards', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('affedilen')->create();
    $this->recordRanked($player, 4200);
    $player->forceFill(['banned_at' => now(), 'ban_reason' => 'Yanlışlık'])->save();
    LeaderboardEntry::query()->where('user_id', $player->id)->delete();

    adminPlayerAction($player, 'unban')->assertOk()->assertExactJson(['changed' => true]);
    adminPlayerAction($player, 'unban')->assertOk()->assertExactJson(['changed' => false]);

    expect($player->fresh()->isBanned())->toBeFalse()
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->where('period', 'all')->value('score'))->toBe(4200)
        ->and(AuditEntry::query()->sole()->details)->toBe(['banReason' => 'Yanlışlık']);
});

test('a ban and a rename say why', function (string $action, array $body) {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('hileci')->create();

    $this->assertApiError(adminPlayerAction($player, $action, $body), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['reason']]]);
})->with([
    'a ban without a reason' => ['ban', []],
    'a ban with two letters' => ['ban', ['reason' => 'ab']],
    'a ban with a novel' => ['ban', ['reason' => str_repeat('x', 192)]],
    'a rename without a reason' => ['rename', []],
]);

test('resetting a name gives an automatic one and keeps the old one on record', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $this->app->instance(GuestNames::class, new GuestNames(drawn(7)));
    $player = User::factory()->withUsername('kufurlu.ad')->create();

    adminPlayerAction($player, 'rename', ['reason' => 'Küfürlü ad'])
        ->assertOk()
        ->assertExactJson(['changed' => true, 'username' => 'guest00000007']);

    expect($player->fresh()->username)->toBe('guest00000007')
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::PlayerRename)
        ->reason->toBe('Küfürlü ad')
        ->details->toBe(['from' => 'kufurlu.ad', 'to' => 'guest00000007']);
});

test('signing a player out ends every session they have', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('kerem.35')->linked('kerem@quezby.com')->create();
    $player->createToken('ios');
    $player->createToken('login');

    adminPlayerAction($player, 'sign-out')->assertOk()->assertExactJson(['changed' => true]);

    expect($player->tokens()->count())->toBe(0)
        ->and(AuditEntry::query()->sole()->details)->toBe(['sessions' => 2]);
});

test('a guest cannot be signed out: the session is the only key to the account', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $guest = User::factory()->withUsername('guest12345678')->create();
    $guest->createToken('ios');

    $this->assertApiError(adminPlayerAction($guest, 'sign-out'), 422, 'validation_failed')
        ->assertJsonPath('error.message', 'Misafir hesabın oturumu kapatılamaz: tek anahtarı o oturum, kapanırsa hesap kaybolur.');
    expect($guest->tokens()->count())->toBe(1);
});

test('an owner deletes an account after typing the player\'s name, and the record of it stays', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('silinecek')->linked('s@quezby.com')->create();
    $this->recordRanked($player, 3000);
    $player->createToken('ios');

    adminPlayerAction($player, 'delete', ['reason' => 'Oyuncu istedi', 'confirm' => 'silinecek'])->assertNoContent();

    expect(User::query()->find($player->id))->toBeNull()
        ->and(Run::query()->where('user_id', $player->id)->count())->toBe(0)
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->count())->toBe(0);

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::PlayerDelete)
        ->and($entry->subject_id)->toBe($player->id)
        ->and($entry->subject_label)->toBe('silinecek')
        ->and($entry->reason)->toBe('Oyuncu istedi')
        ->and($entry->details)->toBe(['runs' => 1, 'email' => true, 'identities' => []]);
});

test('deleting needs the name typed exactly', function (string $confirm) {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('silinecek')->create();

    $this->assertApiError(adminPlayerAction($player, 'delete', ['reason' => 'Oyuncu istedi', 'confirm' => $confirm]), 422, 'validation_failed')
        ->assertJsonPath('error.fields.confirm.0', 'Onaylamak için oyuncunun adını olduğu gibi yaz.');
    expect(User::query()->find($player->id))->not->toBeNull();
})->with(['Silinecek', 'silinecek2', 'baska.biri']);

test('a moderator cannot delete an account', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('silinecek')->create();

    $this->assertApiError(adminPlayerAction($player, 'delete', ['reason' => 'x x x', 'confirm' => 'silinecek']), 403, 'forbidden');
    expect(User::query()->find($player->id))->not->toBeNull();
});

test('an unknown player is not found by any action', function (string $action, array $body) {
    $this->signInAdmin(AdminRole::Owner);

    $this->assertApiError($this->postJson("/api/v1/admin/players/01jzzzzzzzzzzzzzzzzzzzzzzz/{$action}", $body), 404, 'not_found');
})->with([
    ['ban', ['reason' => 'Bot bot']],
    ['unban', []],
    ['rename', ['reason' => 'Küfür']],
    ['sign-out', []],
    ['delete', ['reason' => 'İstek', 'confirm' => 'x']],
]);
