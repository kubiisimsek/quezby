<?php

use App\Enums\AdminRole;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

/**
 * @param  array<string, string|int>  $query
 */
function adminPlayersList(array $query = []): TestResponse
{
    return test()->getJson('/api/v1/admin/players?'.http_build_query($query));
}

/** A player made `$daysAgo` days ago. */
function adminPlayersMade(string $username, int $daysAgo, array $attributes = []): User
{
    return User::factory()->withUsername($username)->create(['created_at' => now()->subDays($daysAgo), ...$attributes]);
}

test('lists players newest first, a page at a time', function () {
    adminPlayersMade('eski', 3);
    adminPlayersMade('orta', 2);
    adminPlayersMade('yeni', 1);

    adminPlayersList(['perPage' => 2])
        ->assertOk()
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 2)
        ->assertJsonPath('total', 3)
        ->assertJsonPath('items.*.username', ['yeni', 'orta']);

    adminPlayersList(['perPage' => 2, 'page' => 2])->assertJsonPath('items.*.username', ['eski']);
    adminPlayersList(['sort' => 'oldest'])->assertJsonPath('items.*.username', ['eski', 'orta', 'yeni']);
});

test('finds a player by the start of their name, their email, their id or their install', function (string $search) {
    adminPlayersMade('kerem.35', 1, ['email' => 'kerem@quezby.com', 'install_id' => 'install-kerem']);
    adminPlayersMade('ekin', 1, ['email' => 'ekin@quezby.com']);

    adminPlayersList(['search' => str_replace('{id}', User::query()->where('username', 'kerem.35')->value('id'), $search)])
        ->assertOk()
        ->assertJsonPath('items.*.username', ['kerem.35']);
})->with([
    'a name prefix, any case' => ['KER'],
    'a handle with its @' => ['@kerem'],
    'an email' => ['Kerem@Quezby.com'],
    'the start of an email' => ['kerem@'],
    'the player id' => ['{id}'],
    'the install id' => ['install-kerem'],
]);

test('a search means what was typed: % and _ are only characters', function () {
    adminPlayersMade('kerem.35', 1);

    adminPlayersList(['search' => '%'])->assertJsonPath('total', 0);
    adminPlayersList(['search' => '_erem'])->assertJsonPath('total', 0);
});

test('filters by status and platform, and counts each status chip', function () {
    adminPlayersMade('aktif', 1, ['platform' => 'ios', 'email' => 'a@quezby.com']);
    adminPlayersMade('misafir', 1, ['platform' => 'ios']);
    adminPlayersMade('hileci', 1, ['platform' => 'ios', 'email' => 'h@quezby.com', 'banned_at' => now(), 'ban_reason' => 'Bot']);
    adminPlayersMade('android', 1, ['platform' => 'android', 'email' => 'x@quezby.com']);

    adminPlayersList(['platform' => 'ios'])
        ->assertJsonPath('total', 3)
        ->assertJsonPath('counts', ['all' => 3, 'active' => 2, 'banned' => 1, 'guest' => 1]);
    adminPlayersList(['status' => 'banned'])->assertJsonPath('items.*.username', ['hileci']);
    adminPlayersList(['status' => 'guest'])->assertJsonPath('items.*.username', ['misafir']);
    adminPlayersList(['status' => 'active', 'platform' => 'ios'])->assertJsonPath('total', 2);
});

test('sorts by the season\'s best, players without one last', function () {
    $low = adminPlayersMade('dusuk', 3);
    adminPlayersMade('hic', 2);
    $high = adminPlayersMade('yuksek', 1);
    $this->recordRanked($low, 1200);
    $this->recordRanked($high, 9800);

    adminPlayersList(['sort' => 'best'])
        ->assertJsonPath('items.*.username', ['yuksek', 'dusuk', 'hic'])
        ->assertJsonPath('items.0.best', 9800)
        ->assertJsonPath('items.2.best', null);
});

test('sorts by the last run played', function () {
    $a = adminPlayersMade('once', 3);
    $b = adminPlayersMade('sonra', 2);
    adminPlayersMade('hic', 1);
    Run::factory()->for($a)->ranked(100)->create(['finished_at' => now()->subHours(5)]);
    Run::factory()->for($b)->ranked(100)->create(['finished_at' => now()->subHour()]);

    adminPlayersList(['sort' => 'lastPlayed'])
        ->assertJsonPath('items.*.username', ['sonra', 'once', 'hic'])
        ->assertJsonPath('items.0.lastPlayedAt', '2026-09-25T08:00:00.000Z');
});

test('each row says what the player is', function () {
    $player = adminPlayersMade('guest48128742', 1, ['platform' => 'android', 'locale' => 'de']);
    $player->identities()->create(['provider' => 'google', 'subject' => 'g-1', 'email' => 'x@gmail.com', 'email_verified' => true]);

    adminPlayersList()
        ->assertJsonPath('items.0', [
            'id' => $player->id,
            'username' => 'guest48128742',
            'bannedAt' => null,
            'avatarUrl' => null,
            'isAutoUsername' => true,
            'isGuest' => false,
            'email' => null,
            'platform' => 'android',
            'identities' => ['google'],
            'locale' => 'de',
            'best' => null,
            'createdAt' => '2026-09-24T09:00:00.000Z',
            'lastPlayedAt' => null,
        ]);
});

test('refuses a filter it does not know and a page too big', function (array $query, string $field) {
    $this->assertApiError(adminPlayersList($query), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    'a page size over 100' => [['perPage' => 101], 'perPage'],
    'page zero' => [['page' => 0], 'page'],
    'an unknown status' => [['status' => 'silinmis'], 'status'],
    'an unknown sort' => [['sort' => 'rastgele'], 'sort'],
    'an unknown platform' => [['platform' => 'windows'], 'platform'],
]);
