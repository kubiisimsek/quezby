<?php

use App\Enums\Locale;
use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\DailyService;
use Illuminate\Support\Carbon;

/*
| "Günün akışı": everyone plays the same feed each Istanbul day, once.
*/

beforeEach(function () {
    config(['quezby.daily.secret' => 'daily-test-secret', 'quezby.daily.epoch' => '2026-09-24']);
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

test('everyone gets the same seed on the same Istanbul day', function () {
    $this->signIn();
    $mine = $this->startRun(['mode' => 'daily'])->assertCreated();
    $this->signIn();
    $theirs = $this->startRun(['mode' => 'daily'])->assertCreated();

    expect($mine->json('seed'))->toBe($theirs->json('seed'))
        ->and($mine->json('mode'))->toBe('daily')
        ->and($mine->json('dayKey'))->toBe('2026-09-26');
});

test('the seed changes at Istanbul midnight', function () {
    $this->signIn();
    $today = $this->startRun(['mode' => 'daily'])->json('seed');

    Carbon::setTestNow(Carbon::parse('2026-09-27 00:01', 'Europe/Istanbul'));
    $this->signIn();
    $tomorrow = $this->startRun(['mode' => 'daily'])->assertCreated();

    expect($tomorrow->json('seed'))->not->toBe($today)->and($tomorrow->json('dayKey'))->toBe('2026-09-27');
});

test('a player gets one attempt a day, finished or not', function () {
    $this->signIn();
    $this->startRun(['mode' => 'daily'])->assertCreated();

    $this->assertApiError($this->startRun(['mode' => 'daily']), 409, 'daily_already_played');
    $this->startRun()->assertCreated();
    $this->assertApiError($this->startRun(['mode' => 'daily']), 409, 'daily_already_played');
});

test('the daily run ranks on the challenge board and on the calendar boards', function () {
    $user = $this->signIn();

    $response = $this->playFeed('daily')->assertOk()->assertJsonPath('run.mode', 'daily')->assertJsonPath('run.status', 'ranked');

    expect(LeaderboardEntry::query()->where('user_id', $user->id)->pluck('period')->map->value->all())
        ->toEqualCanonicalizing(['daily', 'weekly', 'monthly', 'all', 'challenge']);
    $response->assertJsonPath('daily.dayKey', '2026-09-26')
        ->assertJsonPath('daily.number', 3)
        ->assertJsonPath('daily.rank', 1)
        ->assertJsonPath('daily.players', 1);
    expect($response->json('daily.grid'))->toMatch('/^(🟩|🟨|🟥)*⬛$/u')
        ->and($response->json('daily.shareText'))->toContain('Quezby · Günün akışı #3')
        ->toContain($response->json('daily.grid'))
        ->toContain('#1/1');
});

test('today\'s state follows the one attempt from start to result', function () {
    $this->signIn();

    $this->getJson('/api/v1/daily')->assertOk()
        ->assertJsonPath('dayKey', '2026-09-26')
        ->assertJsonPath('number', 3)
        ->assertJsonPath('endsAt', '2026-09-26T21:00:00.000Z')
        ->assertJsonPath('attempt', null)
        ->assertJsonPath('players', 0);

    $run = $this->startRun(['mode' => 'daily'])->json('runId');
    $this->getJson('/api/v1/daily')->assertJsonPath('attempt.status', 'unfinished');

    Run::query()->whereKey($run)->update(['status' => RunStatus::Abandoned->value, 'open_user_id' => null]);
    $this->getJson('/api/v1/daily')->assertJsonPath('attempt.status', 'void');
});

test('a finished attempt shows its rank, grid and share text; others see the top', function () {
    $first = $this->signIn();
    $this->playFeed('daily', reels: 80)->assertOk();
    $second = $this->signIn();
    $this->playFeed('daily', reels: 40)->assertOk();

    $state = $this->getJson('/api/v1/daily')->assertOk();
    $state->assertJsonPath('attempt.status', 'ranked')
        ->assertJsonPath('attempt.rank', 2)
        ->assertJsonPath('players', 2)
        ->assertJsonPath('top.0.username', $first->username)
        ->assertJsonPath('me.username', $second->username);
    expect($state->json('attempt.shareText'))->toContain('#2/2');
});

test('the share text speaks each request\'s language, the finish\'s and today\'s alike', function () {
    $this->signIn();
    $finish = $this->withHeader('Accept-Language', 'en')->playFeed('daily')->assertOk();
    $score = $finish->json('run.score');
    $grid = $finish->json('daily.grid');

    expect($finish->json('daily.shareText'))->toBe("Quezby · Daily Feed #3\n{$grid}\n".Locale::En->group($score).' points · #1/1')
        ->and($finish->json('shareText'))->toBe($finish->json('daily.shareText'));

    // Never stored: the same attempt, read again in another language, is written in it.
    expect($this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/daily')->json('attempt.shareText'))
        ->toStartWith("\u{200F}Quezby · خلاصة اليوم #3\n\u{200F}{$grid}\n\u{200F}".Locale::Ar->group($score).' ')
        ->toEndWith(' · #1/1');
    expect($this->withHeader('Accept-Language', 'tr')->getJson('/api/v1/daily')->json('attempt.shareText'))
        ->toBe("Quezby · Günün akışı #3\n{$grid}\n".Locale::Tr->group($score).' puan · #1/1');
});

test('the day\'s share text is written in each language', function (string $locale, string $ranked, string $unranked) {
    app()->setLocale($locale);
    $daily = app(DailyService::class);

    expect($daily->shareText(3, '🟩🟨⬛', 52340, 37, 1204))->toBe($ranked)
        ->and($daily->shareText(17, '⬛', 1, null, 5))->toBe($unranked);
})->with([
    'Turkish' => ['tr', "Quezby · Günün akışı #3\n🟩🟨⬛\n52.340 puan · #37/1.204", "Quezby · Günün akışı #17\n⬛\n1 puan"],
    'English' => ['en', "Quezby · Daily Feed #3\n🟩🟨⬛\n52,340 points · #37/1,204", "Quezby · Daily Feed #17\n⬛\n1 point"],
    'German' => ['de', "Quezby · Tages-Feed #3\n🟩🟨⬛\n52.340 Punkte · #37/1.204", "Quezby · Tages-Feed #17\n⬛\n1 Punkt"],
    'Arabic' => [
        'ar',
        "\u{200F}Quezby · خلاصة اليوم #3\n\u{200F}🟩🟨⬛\n\u{200F}52,340 نقطة · #37/1,204",
        "\u{200F}Quezby · خلاصة اليوم #17\n\u{200F}⬛\n\u{200F}نقطة واحدة",
    ],
    'French' => ['fr', "Quezby · Fil du jour #3\n🟩🟨⬛\n52\u{00A0}340 points · #37/1\u{00A0}204", "Quezby · Fil du jour #17\n⬛\n1 point"],
    'Spanish' => ['es', "Quezby · Feed del día #3\n🟩🟨⬛\n52.340 puntos · #37/1204", "Quezby · Feed del día #17\n⬛\n1 punto"],
]);

test('Arabic counts a score in six forms', function (int $score, string $points) {
    app()->setLocale('ar');

    expect(app(DailyService::class)->shareText(3, '⬛', $score, null, 1))->toEndWith("\n\u{200F}{$points}");
})->with([
    [0, '0 نقطة'],
    [1, 'نقطة واحدة'],
    [2, 'نقطتان'],
    [7, '7 نقاط'],
    [15, '15 نقطة'],
    [100, '100 نقطة'],
    [1203, '1,203 نقاط'],
]);

test('the grid reads each level of the run, the last one black', function () {
    $daily = app(DailyService::class);

    expect($daily->grid([0, 1, 2, 3, 0]))->toBe('🟩🟨🟨🟥⬛')
        ->and($daily->grid([4]))->toBe('⬛')
        ->and($daily->grid([]))->toBe('⬛');
});

test('the challenge is numbered from the first day', function () {
    $daily = app(DailyService::class);

    expect($daily->number('2026-09-24'))->toBe(1)
        ->and($daily->number('2026-10-24'))->toBe(31)
        ->and($daily->number('2026-01-01'))->toBe(1);
});

test('a second account on one phone playing the same feed is a soft signal', function () {
    User::factory()->withUsername('ilk.hesap')->create(['install_id' => 'phone-1'])
        ->runs()->create(['seed' => 1, 'engine_version' => 2, 'status' => RunStatus::Started, 'mode' => 'daily', 'daily_key' => '2026-09-26', 'started_at' => now()]);
    $this->signIn(User::factory()->withUsername('ikinci.hesap')->create(['install_id' => 'phone-1']));

    $response = $this->playFeed('daily')->assertOk();

    expect(collect(Run::query()->findOrFail($response->json('run.runId'))->flags)->pluck('code')->all())->toContain('daily_shared_install');
});

test('daily state needs a player and is throttled', function () {
    $this->assertApiError($this->getJson('/api/v1/daily'), 401, 'unauthenticated');

    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/daily')->assertOk();
    }
    $this->assertApiError($this->getJson('/api/v1/daily'), 429, 'too_many_requests');
});
