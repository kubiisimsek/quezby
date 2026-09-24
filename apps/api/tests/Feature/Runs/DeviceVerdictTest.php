<?php

use App\Enums\DeviceVerdict;
use App\Enums\Platform;
use App\Models\DeviceCheck;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\Integrity\DeviceCheckResult;
use App\Services\Integrity\DeviceIntegrity;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/*
| A run records the player's device verdict standing when it starts
| (`runs.device_verdict`); `QUEZBY_INTEGRITY_MODE` says what it does at the
| finish. `enforce`: a failed device never ranks and the player is told why;
| no verdict holds a top score for review. `log`: recorded, nothing else.
| `off`: not even recorded.
*/

/** The player's phone was checked just now. */
function deviceChecked(User $player, DeviceVerdict $verdict): void
{
    app(DeviceIntegrity::class)->record($player, Platform::Android, match ($verdict) {
        DeviceVerdict::Pass => DeviceCheckResult::pass(),
        default => DeviceCheckResult::fail('device'),
    });
}

/** Starts the fixture's run and finishes it honestly, as if it had just been played. */
function playFixture(object $test, string $name = 'good-42'): TestResponse
{
    $fixture = replayFixture($name);
    $runId = $test->startRunFor($fixture);

    return $test->finishRunFor($runId, $fixture);
}

beforeEach(function () {
    Carbon::setTestNow('2026-09-24 12:00:00.000');
    $this->player = $this->signIn();
});

describe('at the start', function () {
    it('records the verdict standing', function (DeviceVerdict $verdict) {
        deviceChecked($this->player, $verdict);
        $this->travel(5)->hours();

        $runId = $this->startRun()->assertCreated()->json('runId');

        expect(Run::query()->findOrFail($runId)->device_verdict)->toBe($verdict);
    })->with([DeviceVerdict::Pass, DeviceVerdict::Fail]);

    it('records none when no verdict stands', function (Closure $setUp) {
        $setUp($this->player, $this);

        $runId = $this->startRun()->assertCreated()->json('runId');

        expect(Run::query()->findOrFail($runId)->device_verdict)->toBeNull();
    })->with([
        'never checked' => [fn () => null],
        'a pass that ran out' => [function (User $player, $test) {
            deviceChecked($player, DeviceVerdict::Pass);
            $test->travel(6)->hours();
        }],
        'a fail that ran out' => [function (User $player, $test) {
            deviceChecked($player, DeviceVerdict::Fail);
            $test->travel(12)->hours();
        }],
        "another player's" => [fn () => deviceChecked(User::factory()->withUsername()->create(), DeviceVerdict::Pass)],
        'one from later on' => [function (User $player, $test) {
            $test->travel(1)->minutes();
            deviceChecked($player, DeviceVerdict::Pass);
            $test->travel(-1)->minutes();
        }],
    ]);

    it('records the latest verdict', function () {
        deviceChecked($this->player, DeviceVerdict::Fail);
        $this->travel(1)->hours();
        deviceChecked($this->player, DeviceVerdict::Pass);

        expect(Run::query()->findOrFail($this->startRun()->json('runId'))->device_verdict)->toBe(DeviceVerdict::Pass);

        $this->travel(1)->minutes();
        deviceChecked($this->player, DeviceVerdict::Fail);
        expect(Run::query()->findOrFail($this->startRun()->json('runId'))->device_verdict)->toBe(DeviceVerdict::Fail);
    });

    it('sees a verdict made the same second', function () {
        Carbon::setTestNow('2026-09-24 12:00:00.600');
        deviceChecked($this->player, DeviceVerdict::Pass);
        Carbon::setTestNow('2026-09-24 12:00:00.900');

        expect(Run::query()->findOrFail($this->startRun()->json('runId'))->device_verdict)->toBe(DeviceVerdict::Pass);
    });

    it('records nothing with devices off', function () {
        config(['quezby.integrity.mode' => 'off']);
        deviceChecked($this->player, DeviceVerdict::Fail);

        expect(Run::query()->findOrFail($this->startRun()->json('runId'))->device_verdict)->toBeNull();
    });
});

describe('enforced', function () {
    beforeEach(fn () => config(['quezby.integrity.mode' => 'enforce']));

    it("keeps a failed device's runs off every board, and tells the player why", function () {
        deviceChecked($this->player, DeviceVerdict::Fail);

        playFixture($this)
            ->assertOk()
            ->assertJsonPath('run.status', 'flagged')
            ->assertJsonPath('run.flagReason', 'device')
            ->assertJsonPath('run.score', replayFixture('good-42')['summary']['score'])
            ->assertJsonPath('best', null)
            ->assertJsonPath('league', null);

        expect(Run::query()->sole()->flags)->toBe([['code' => 'device_integrity', 'severity' => 'hard']])
            ->and(LeaderboardEntry::query()->count())->toBe(0);
    });

    it('says device even when the run failed other checks too', function () {
        deviceChecked($this->player, DeviceVerdict::Fail);
        $fixture = replayFixture('good-42');

        $this->finishRunFor($this->startRunFor($fixture, startedSecondsAgo: 10), $fixture)
            ->assertJsonPath('run.status', 'flagged')
            ->assertJsonPath('run.flagReason', 'device');
    });

    it('does not explain the other checks', function () {
        deviceChecked($this->player, DeviceVerdict::Pass);
        $fixture = replayFixture('good-42');

        $this->finishRunFor($this->startRunFor($fixture, startedSecondsAgo: 10), $fixture)
            ->assertJsonPath('run.status', 'flagged')
            ->assertJsonPath('run.flagReason', null);
    });

    it('ranks a device that passed', function () {
        deviceChecked($this->player, DeviceVerdict::Pass);

        playFixture($this)->assertJsonPath('run.status', 'ranked')->assertJsonPath('run.flagReason', null);

        expect(Run::query()->sole()->flags)->toBeNull();
    });

    it('holds a top score from a device without a verdict for review', function () {
        playFixture($this)
            ->assertJsonPath('run.status', 'review')
            ->assertJsonPath('run.flagReason', null);

        expect(Run::query()->sole()->flags)->toBe([['code' => 'device_unverified', 'severity' => 'soft']]);
    });

    it('ranks a score below the top from a device without a verdict, with the signal kept', function () {
        foreach (range(1, 10) as $i) {
            $this->recordRanked(User::factory()->withUsername("usta{$i}")->create(), 50_000_000 + $i);
        }

        playFixture($this)->assertJsonPath('run.status', 'ranked');

        expect(Run::query()->where('user_id', $this->player->id)->sole()->flags)->toBe([['code' => 'device_unverified', 'severity' => 'soft']]);
    });

    it('judges the verdict the run started with, not a later one', function () {
        deviceChecked($this->player, DeviceVerdict::Fail);
        $fixture = replayFixture('good-42');
        $runId = $this->startRunFor($fixture);
        deviceChecked($this->player, DeviceVerdict::Pass);

        $this->finishRunFor($runId, $fixture)->assertJsonPath('run.status', 'flagged');
    });
});

describe('logged', function () {
    beforeEach(fn () => config(['quezby.integrity.mode' => 'log']));

    it('records a failed device on the run and changes nothing else', function () {
        deviceChecked($this->player, DeviceVerdict::Fail);

        playFixture($this)->assertJsonPath('run.status', 'ranked')->assertJsonPath('run.flagReason', null);

        $run = Run::query()->sole();
        expect($run->device_verdict)->toBe(DeviceVerdict::Fail)
            ->and($run->flags)->toBeNull()
            ->and(LeaderboardEntry::query()->count())->toBe(4);
    });

    it('holds nothing back for a missing verdict', function () {
        playFixture($this)->assertJsonPath('run.status', 'ranked');

        expect(Run::query()->sole()->flags)->toBeNull();
    });

    it('is the mode for a value it does not know', function () {
        config(['quezby.integrity.mode' => 'enforced']);
        deviceChecked($this->player, DeviceVerdict::Fail);

        playFixture($this)->assertJsonPath('run.status', 'ranked');
        expect(Run::query()->sole()->device_verdict)->toBe(DeviceVerdict::Fail);
    });
});

describe('off', function () {
    it('neither records nor judges', function () {
        config(['quezby.integrity.mode' => 'off']);
        deviceChecked($this->player, DeviceVerdict::Fail);

        playFixture($this)->assertJsonPath('run.status', 'ranked')->assertJsonPath('run.flagReason', null);

        $run = Run::query()->sole();
        expect($run->device_verdict)->toBeNull()
            ->and($run->flags)->toBeNull();
    });
});

describe('verdicts', function () {
    it('keep a pass for six hours and a fail for twelve, and forget them a month after', function () {
        $answer = app(DeviceIntegrity::class)->record($this->player, Platform::Ios, DeviceCheckResult::pass(['keyId' => 'k']));
        expect($answer->toArray())->toBe(['verdict' => 'pass', 'validUntil' => '2026-09-24T18:00:00.000Z', 'enforced' => false]);

        $this->travelTo(Carbon::parse('2026-10-25 12:00:00'));
        $answer = app(DeviceIntegrity::class)->record($this->player, Platform::Ios, DeviceCheckResult::fail('counter'));
        expect($answer->toArray())->toBe(['verdict' => 'fail', 'validUntil' => '2026-10-26T00:00:00.000Z', 'enforced' => false]);

        expect(DeviceCheck::query()->pluck('reason')->all())->toBe(['counter']);
    });

    it('never store an unavailable check', function () {
        $answer = app(DeviceIntegrity::class)->record($this->player, Platform::Android, DeviceCheckResult::unavailable('google'));

        expect($answer->toArray())->toBe(['verdict' => 'unavailable', 'validUntil' => '2026-09-24T12:30:00.000Z', 'enforced' => false])
            ->and(DeviceCheck::query()->count())->toBe(0);
    });

    it('say they are enforced only in enforce mode', function (string $mode, bool $enforced) {
        config(['quezby.integrity.mode' => $mode]);

        foreach ([DeviceCheckResult::pass(), DeviceCheckResult::fail('device'), DeviceCheckResult::unavailable('google')] as $result) {
            expect(app(DeviceIntegrity::class)->record($this->player, Platform::Android, $result)->toArray()['enforced'])->toBe($enforced);
        }
    })->with([['enforce', true], ['log', false], ['off', false], ['something else', false]]);
});
