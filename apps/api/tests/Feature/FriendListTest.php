<?php

use App\Models\User;
use App\Support\NameCursor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

/** `$owner` and a friend for each of `$names`. */
function friendListOf(User $owner, array $names): void
{
    foreach ($names as $name) {
        test()->befriend($owner, User::factory()->withUsername($name)->create());
    }
}

test('a player sees their own friends A to Z, a banned one left out', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    friendListOf($me, ['zeynep', 'ada', 'mert*34', 'can.k']);
    $this->befriend($me, User::factory()->withUsername('yasakli')->create(['banned_at' => now()]));
    $this->recordRanked(User::query()->where('username', 'ada')->sole(), 4200);

    $this->getJson('/api/v1/users/ben/friends')
        ->assertOk()
        ->assertJsonPath('friends.*.username', ['ada', 'can.k', 'mert*34', 'zeynep'])
        ->assertJsonPath('friends.0', ['username' => 'ada', 'avatarUrl' => null, 'best' => 4200, 'league' => null, 'relation' => 'friend'])
        ->assertJsonPath('friends.*.relation', ['friend', 'friend', 'friend', 'friend'])
        ->assertJsonPath('total', 4)
        ->assertJsonPath('nextCursor', null);
});

test('a friend sees the list too, each row as it stands to them', function () {
    $owner = User::factory()->withUsername('kanka')->create();
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $this->befriend($owner, $me);
    $mutual = User::factory()->withUsername('ortak')->create();
    $this->befriend($owner, $mutual);
    $this->befriend($me, $mutual);
    $asked = User::factory()->withUsername('istedim')->create();
    $this->befriend($owner, $asked);
    $this->requestFriend($me, $asked);
    $asking = User::factory()->withUsername('istiyor')->create();
    $this->befriend($owner, $asking);
    $this->requestFriend($asking, $me);
    friendListOf($owner, ['yabanci']);

    $this->getJson('/api/v1/users/kanka/friends')
        ->assertOk()
        ->assertJsonPath('friends.*.username', ['ben', 'istedim', 'istiyor', 'ortak', 'yabanci'])
        ->assertJsonPath('friends.*.relation', ['none', 'requested', 'incoming', 'friend', 'none'])
        ->assertJsonPath('total', 5);
});

test('anyone else is told the list is theirs and their friends\' to see', function () {
    $owner = User::factory()->withUsername('kanka')->create();
    friendListOf($owner, ['ada']);
    $me = $this->signIn();
    $this->requestFriend($me, $owner);

    $this->assertApiError($this->getJson('/api/v1/users/kanka/friends'), 403, 'friends_hidden')
        ->assertJsonPath('error.message', 'Bu listeyi yalnızca arkadaşları görebilir.');
    $this->withHeader('Accept-Language', 'en');
    $this->assertApiError($this->getJson('/api/v1/users/kanka/friends'), 403, 'friends_hidden')
        ->assertJsonPath('error.message', 'Only their friends can see this list.');
});

test('a player who is not there for the viewer has no list', function () {
    $me = $this->signIn();
    $banned = User::factory()->withUsername('yasakli')->create();
    $this->befriend($me, $banned);
    $banned->forceFill(['banned_at' => now()])->save();
    $blocker = User::factory()->withUsername('engelleyen')->create();
    $this->block($blocker, $me);

    $this->assertApiError($this->getJson('/api/v1/users/kimse.yok/friends'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/users/yasakli/friends'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/users/engelleyen/friends'), 404, 'not_found');
});

test('a block either way with the viewer hides that row, and the total with it', function () {
    $owner = User::factory()->withUsername('kanka')->create();
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $this->befriend($owner, $me);
    friendListOf($owner, ['ada', 'engelledim', 'engelledi']);
    $this->block($me, User::query()->where('username', 'engelledim')->sole());
    $this->block(User::query()->where('username', 'engelledi')->sole(), $me);

    $this->getJson('/api/v1/users/kanka/friends')
        ->assertOk()
        ->assertJsonPath('friends.*.username', ['ada', 'ben'])
        ->assertJsonPath('total', 2);

    // The owner, who blocked nobody, still sees them all.
    $this->signIn($owner);
    $this->getJson('/api/v1/users/kanka/friends')->assertJsonPath('total', 4);
});

test('the list pages fifty at a time, A to Z, the total the same on every page', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $names = array_map(fn (int $i) => sprintf('oyuncu%02d', $i), range(1, 51));
    shuffle($names);
    friendListOf($me, $names);

    $first = $this->getJson('/api/v1/users/ben/friends')->assertOk()->assertJsonPath('total', 51);
    $cursor = $first->json('nextCursor');
    expect($first->json('friends'))->toHaveCount(50)
        ->and($first->json('friends.49.username'))->toBe('oyuncu50')
        ->and($cursor)->toBe(NameCursor::encode('oyuncu50'));

    $this->getJson("/api/v1/users/ben/friends?cursor={$cursor}")
        ->assertOk()
        ->assertJsonPath('friends.*.username', ['oyuncu51'])
        ->assertJsonPath('total', 51)
        ->assertJsonPath('nextCursor', null);
});

test('a cursor that cannot be a name is refused', function (string $cursor) {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    friendListOf($me, ['ada']);

    $this->assertApiError($this->getJson('/api/v1/users/ben/friends?cursor='.urlencode($cursor)), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['cursor']]]);
})->with([
    'not base64' => ['!!!'],
    'a capital' => [NameCursor::encode('Ada')],
    'too short' => [NameCursor::encode('ab')],
    'too long' => [NameCursor::encode(str_repeat('a', 21))],
    'a space' => [NameCursor::encode('a da')],
    'far too long' => [str_repeat('a', 201)],
]);

test('the number of queries does not grow with the list', function () {
    $owner = User::factory()->withUsername('kanka')->create();
    $me = $this->signIn();
    $this->befriend($owner, $me);
    $count = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/users/kanka/friends')->assertOk();

        return count(DB::getQueryLog());
    };
    friendListOf($owner, ['ada']);
    $few = $count();

    foreach (User::factory()->withUsername()->count(30)->create() as $i => $player) {
        $this->recordRanked($player, 1000 + $i);
        $this->befriend($owner, $player);
        if ($i % 3 === 0) {
            $this->befriend($me, $player);
        } elseif ($i % 5 === 0) {
            $this->requestFriend($player, $me);
        }
    }

    expect($count())->toBe($few);
});

test('a friend list needs a player', function () {
    User::factory()->withUsername('kanka')->create();

    $this->assertApiError($this->getJson('/api/v1/users/kanka/friends'), 401, 'unauthenticated');
});
