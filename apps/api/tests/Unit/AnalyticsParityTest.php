<?php

use App\Enums\AnalyticsEvent;
use App\Enums\AnalyticsScreen;

/*
| The analytics catalog is one list on each side: `@quezby/config`'s
| ANALYTICS_* (packages/config/fixtures/analytics.json) and the API's enums
| and limits — so a code the app sends is a code the API keeps.
*/

it('names the same screens', function () {
    expect(collect(AnalyticsScreen::cases())->map(fn (AnalyticsScreen $screen) => $screen->value)->all())
        ->toBe(sharedFixture('packages/config/fixtures/analytics.json')['screens']);
});

it('names the same moments, and the same of them are firsts', function () {
    $fixture = sharedFixture('packages/config/fixtures/analytics.json');

    expect(collect(AnalyticsEvent::cases())->map(fn (AnalyticsEvent $event) => $event->value)->all())->toBe($fixture['events'])
        ->and(collect(AnalyticsEvent::cases())->filter->isMilestone()->map(fn (AnalyticsEvent $event) => $event->value)->values()->all())->toBe($fixture['milestones']);
});

it('holds a phone to the same limits', function () {
    $limits = sharedFixture('packages/config/fixtures/analytics.json')['limits'];

    expect(config('quezby.analytics.limits'))->toBe([
        'visits_per_batch' => $limits['visitsPerBatch'],
        'journey_steps' => $limits['journeySteps'],
        'max_count' => $limits['maxCount'],
        'max_age_days' => $limits['maxAgeDays'],
        'max_visit_seconds' => $limits['maxVisitSeconds'],
    ]);
});

it('keeps every code a short bucket name', function () {
    foreach ([...AnalyticsScreen::cases(), ...AnalyticsEvent::cases()] as $code) {
        expect(strlen($code->bucket()))->toBeLessThanOrEqual(40);
    }
});
