<?php

/*
| The wall-clock check must know the app's real pace between reels:
| `@quezby/config`'s PACE (packages/config/fixtures/pace.json) and
| `config/quezby.php` › plausibility.pace are one set of numbers.
*/

it('paces reels exactly like the app', function () {
    $app = sharedFixture('packages/config/fixtures/pace.json');
    $api = config('quezby.plausibility.pace');

    expect($api)->toBe([
        'countdown_step_ms' => $app['countdownStepMs'],
        'countdown_steps' => $app['countdownSteps'],
        'slide_ms' => $app['slideMs'],
        'exit_ms' => [
            'skip_hit' => $app['exitMs']['skipHit'],
            'hit' => $app['exitMs']['hit'],
            'miss' => $app['exitMs']['miss'],
        ],
    ]);
});
