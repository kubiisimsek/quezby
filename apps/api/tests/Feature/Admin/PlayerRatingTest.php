<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Models\AuditEntry;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/*
| `POST /admin/players/{id}/rating`: an owner sets a player's rating (qb) by
| hand — to test the leagues, or to put one right. It places a player not
| placed yet, the player sees it as an `adjust` in their history, and the
| audit log keeps where it was and where it went.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
});

/**
 * @param  array<string, mixed>  $body
 */
function setPlayerRating(User $player, array $body): TestResponse
{
    return test()->postJson("/api/v1/admin/players/{$player->id}/rating", $body);
}

test('an owner sets a placed player\'s rating, and the league follows it', function () {
    $owner = $this->signInAdmin(AdminRole::Owner, ['name' => 'Kubilay']);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 1450, now()->subDays(3), ['peak' => 1600]);

    setPlayerRating($player, ['rating' => 3250, 'reason' => 'Lig testi'])
        ->assertOk()
        ->assertExactJson(['changed' => true, 'rating' => 3250, 'tier' => 'platinum']);

    $rating = PlayerRating::query()->findOrFail($player->id);
    expect($rating->rating)->toBe(3250)
        ->and($rating->tier)->toBe(LeagueTier::Platinum)
        ->and($rating->peak)->toBe(3250)
        ->and($rating->changed_at?->equalTo(now()))->toBeTrue()
        ->and($rating->rated_runs)->toBe(20)
        ->and($rating->rated_at?->equalTo(now()->subDays(3)))->toBeTrue();

    expect(RatingChange::query()->sole())
        ->kind->toBe(RatingKind::Adjust)
        ->before->toBe(1450)
        ->after->toBe(3250)
        ->delta->toBe(1800)
        ->tier_before->toBe(LeagueTier::Silver)
        ->tier_after->toBe(LeagueTier::Platinum)
        ->run_id->toBeNull();

    expect(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::PlayerRating)
        ->via->toBe(AuditVia::Panel)
        ->admin_id->toBe($owner->id)
        ->actor_label->toBe('Kubilay')
        ->subject_id->toBe($player->id)
        ->subject_label->toBe('kerem.35')
        ->reason->toBe('Lig testi')
        ->details->toBe(['from' => 1450, 'to' => 3250, 'tierFrom' => 'silver', 'tierTo' => 'platinum']);
});

test('the player sees the new rating, its league and the move in their history', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 2400);

    setPlayerRating($player, ['rating' => 1900, 'reason' => 'Düzeltme'])->assertOk();

    $this->signIn($player);
    $this->getJson('/api/v1/rating')->assertOk()
        ->assertJsonPath('rating', 1900)
        ->assertJsonPath('tier', 'silver')
        ->assertJsonPath('difficulty', 4)
        ->assertJsonPath('history.0', [
            'kind' => 'adjust',
            'delta' => -500,
            'before' => 2400,
            'after' => 1900,
            'score' => null,
            'target' => null,
            'tier' => 'silver',
            'runId' => null,
            'at' => '2026-10-01T09:00:00.000Z',
        ]);
});

test('a player still placing is placed by it, and their placement ends', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('yeni')->create();
    PlayerRating::query()->create(['user_id' => $player->id, 'placement_scores' => [30000], 'rated_runs' => 1, 'rated_at' => now()->subDay()]);

    setPlayerRating($player, ['rating' => 4200, 'reason' => 'Elmas ligini dene'])
        ->assertOk()
        ->assertExactJson(['changed' => true, 'rating' => 4200, 'tier' => 'diamond']);

    expect(RatingChange::query()->sole())
        ->kind->toBe(RatingKind::Adjust)
        ->before->toBeNull()
        ->after->toBe(4200)
        ->delta->toBe(0)
        ->tier_before->toBeNull()
        ->tier_after->toBe(LeagueTier::Diamond);
    expect(AuditEntry::query()->sole()->details)->toBe(['from' => null, 'to' => 4200, 'tierFrom' => null, 'tierTo' => 'diamond']);

    $this->signIn($player);
    $this->getJson('/api/v1/rating')->assertOk()
        ->assertJsonPath('unlock', null)
        ->assertJsonPath('placed', true)
        ->assertJsonPath('rating', 4200)
        ->assertJsonPath('tier', 'diamond')
        ->assertJsonPath('placement', null)
        ->assertJsonPath('history.0.kind', 'adjust')
        ->assertJsonPath('history.0.after', 4200);
});

test('it opens Dereceli to a player who has not counted the runs for it yet', function () {
    $player = User::factory()->withUsername('acemi')->create();

    $this->signIn($player);
    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20, 'placement' => 3]);

    $this->signInAdmin(AdminRole::Owner);
    setPlayerRating($player, ['rating' => 1000, 'reason' => 'Dereceli testi'])->assertOk()->assertJsonPath('tier', 'silver');

    $this->signIn($player);
    $this->getJson('/api/v1/rating')->assertOk()
        ->assertJsonPath('unlock', null)
        ->assertJsonPath('placed', true)
        ->assertJsonPath('rating', 1000)
        ->assertJsonPath('placement', null);
    expect(PlayerRating::query()->findOrFail($player->id))
        ->rated_runs->toBe(0)
        ->rated_at->toBeNull();
});

test('the panel shows the move in the player\'s rating history, as counted', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 2400);

    setPlayerRating($player, ['rating' => 2600, 'reason' => 'Düzeltme'])->assertOk();

    $this->getJson("/api/v1/admin/players/{$player->id}")->assertOk()
        ->assertJsonPath('rating.rating', 2600)
        ->assertJsonPath('rating.tier', 'gold')
        ->assertJsonPath('rating.history.0.kind', 'adjust')
        ->assertJsonPath('rating.history.0.delta', 200)
        ->assertJsonPath('rating.history.0.counted', true)
        ->assertJsonPath('rating.history.0.engineVersion', null)
        ->assertJsonPath('audit.0.action', 'player.rating');
});

test('the rating it has already changes nothing and records nothing', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 2400, now()->subDay());

    setPlayerRating($player, ['rating' => 2400, 'reason' => 'Aynı değer'])
        ->assertOk()
        ->assertExactJson(['changed' => false, 'rating' => 2400, 'tier' => 'gold']);

    expect(RatingChange::query()->count())->toBe(0)
        ->and(AuditEntry::query()->count())->toBe(0)
        ->and(PlayerRating::query()->findOrFail($player->id)->changed_at?->equalTo(now()->subDay()))->toBeTrue();
});

test('a rating set to equal another ranks behind the one who got there first', function () {
    $this->signInAdmin(AdminRole::Owner);
    $first = User::factory()->withUsername('ilk')->create();
    $player = User::factory()->withUsername('sonra')->create();
    $this->rate($first, 3000, now()->subDay());
    $this->rate($player, 2800, now()->subHours(2));

    setPlayerRating($player, ['rating' => 3000, 'reason' => 'Eşitlik testi'])->assertOk();

    $this->signIn($player);
    $this->getJson('/api/v1/ratings')->assertOk()
        ->assertJsonPath('entries.*.username', ['ilk', 'sonra'])
        ->assertJsonPath('me.rank', 2);
});

test('a promotion\'s shield stays in its league and goes when the rating leaves it', function () {
    $this->signInAdmin(AdminRole::Owner);
    $stays = User::factory()->withUsername('kalan')->create();
    $leaves = User::factory()->withUsername('giden')->create();
    $this->rate($stays, 2100, attributes: ['shield_tier' => LeagueTier::Gold, 'shield_left' => 2]);
    $this->rate($leaves, 2100, attributes: ['shield_tier' => LeagueTier::Gold, 'shield_left' => 2]);

    setPlayerRating($stays, ['rating' => 2700, 'reason' => 'Aynı lig'])->assertOk();
    setPlayerRating($leaves, ['rating' => 3100, 'reason' => 'Üst lig'])->assertOk();

    expect(PlayerRating::query()->findOrFail($stays->id))
        ->shield_tier->toBe(LeagueTier::Gold)
        ->shield_left->toBe(2);
    expect(PlayerRating::query()->findOrFail($leaves->id))
        ->shield_tier->toBeNull()
        ->shield_left->toBe(0);
});

test('a new rating takes a reason and a whole number from 0 to 9999', function (array $body, string $field) {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();

    $this->assertApiError(setPlayerRating($player, $body), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
    expect(PlayerRating::query()->count())->toBe(0)
        ->and(AuditEntry::query()->count())->toBe(0);
})->with([
    'no reason' => [['rating' => 1500], 'reason'],
    'two letters' => [['rating' => 1500, 'reason' => 'ab'], 'reason'],
    'no rating' => [['reason' => 'Lig testi'], 'rating'],
    'below zero' => [['rating' => -1, 'reason' => 'Lig testi'], 'rating'],
    'five digits' => [['rating' => 10000, 'reason' => 'Lig testi'], 'rating'],
    'a fraction' => [['rating' => 1500.5, 'reason' => 'Lig testi'], 'rating'],
    'a word' => [['rating' => 'çok', 'reason' => 'Lig testi'], 'rating'],
]);

test('the highest and lowest ratings are allowed', function (int $rating, string $tier) {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();

    setPlayerRating($player, ['rating' => $rating, 'reason' => 'Sınır testi'])->assertOk()->assertJsonPath('tier', $tier);
})->with([
    'zero' => [0, 'bronze'],
    '9999' => [9999, 'master'],
]);

test('only an owner sets a rating', function (AdminRole $role) {
    $this->signInAdmin($role);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 2400);

    $this->assertApiError(setPlayerRating($player, ['rating' => 5000, 'reason' => 'Lig testi']), 403, 'forbidden');
    expect(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2400)
        ->and(AuditEntry::query()->count())->toBe(0);
})->with([
    'a moderator' => [AdminRole::Moderator],
    'a viewer' => [AdminRole::Viewer],
]);

test('a player\'s token cannot set a rating, their own least of all', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 2400);

    $response = $this->postJson(
        "/api/v1/admin/players/{$player->id}/rating",
        ['rating' => 5000, 'reason' => 'Kendime'],
        ['Authorization' => 'Bearer '.$player->createToken('ios')->plainTextToken],
    );

    $this->assertApiError($response, 401, 'unauthenticated');
    expect(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2400);
});

test('an unknown player is not found', function () {
    $this->signInAdmin(AdminRole::Owner);

    $this->assertApiError(
        $this->postJson('/api/v1/admin/players/01jzzzzzzzzzzzzzzzzzzzzzzz/rating', ['rating' => 1500, 'reason' => 'Lig testi']),
        404,
        'not_found',
    );
});

test('the audit log lists the change under its own action', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->rate($player, 1200);
    setPlayerRating($player, ['rating' => 5100, 'reason' => 'MasterClass testi'])->assertOk();

    $this->getJson('/api/v1/admin/audit?action=player.rating')->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.action', 'player.rating')
        ->assertJsonPath('items.0.subject', ['type' => 'player', 'id' => $player->id, 'label' => 'kerem.35'])
        ->assertJsonPath('items.0.reason', 'MasterClass testi')
        ->assertJsonPath('items.0.details', ['from' => 1200, 'to' => 5100, 'tierFrom' => 'silver', 'tierTo' => 'master']);
});

test('says what is wrong with the new rating in Turkish, as the panel shows it', function () {
    $this->signInAdmin(AdminRole::Owner);
    $player = User::factory()->withUsername('kerem.35')->create();

    setPlayerRating($player, ['rating' => 10000, 'reason' => 'Lig testi'])
        ->assertStatus(422)
        ->assertJsonPath('error.fields.rating', ['Qb en fazla 9999 olabilir.']);
});
