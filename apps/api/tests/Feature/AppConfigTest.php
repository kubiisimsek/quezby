<?php

use App\Content\Catalog;
use App\Game\Rules;

beforeEach(function () {
    config([
        'quezby.apps.ios' => ['min_version' => '1.2.0', 'latest_version' => '1.4.0', 'store_url' => 'https://apps.apple.com/app/id1'],
        'quezby.apps.android' => ['min_version' => '1.0.0', 'latest_version' => '1.0.0', 'store_url' => null],
    ]);
});

test('status for a version', function (string $platform, ?string $version, string $status) {
    $query = http_build_query(array_filter(['platform' => $platform, 'version' => $version]));

    $this->getJson('/api/v1/app/config?'.$query)
        ->assertOk()
        ->assertJsonPath('status', $status)
        ->assertJsonPath('engineVersion', Rules::ENGINE_VERSION);
})->with('app versions');

it("describes the platform's release", function () {
    $this->getJson('/api/v1/app/config?platform=ios&version=1.4.0')->assertExactJson([
        'status' => 'ok',
        'engineVersion' => Rules::ENGINE_VERSION,
        'contentVersion' => Catalog::LATEST,
        'latestVersion' => '1.4.0',
        'minVersion' => '1.2.0',
        'storeUrl' => 'https://apps.apple.com/app/id1',
    ]);
    $this->getJson('/api/v1/app/config?platform=android&version=1.0.0')->assertJsonPath('storeUrl', null);
});

test('the platform must be known', function () {
    $this->assertApiError($this->getJson('/api/v1/app/config?platform=web&version=1.0.0'), 422, 'validation_failed');
});

test('health', function () {
    $response = $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'ok');

    $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/', $response->json('time'));
});
