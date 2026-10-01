<?php

use App\Enums\AdminRole;
use App\Support\Release;

beforeEach(function () {
    $this->versionFile = tempnam(sys_get_temp_dir(), 'quezby-version-');
});

afterEach(function () {
    Release::useFile(null);
    @unlink($this->versionFile);
});

test('health names the release the deploy wrote', function () {
    file_put_contents($this->versionFile, json_encode(['version' => '1.02.00.07', 'deployedAt' => '2026-10-01T09:00:00Z']));
    Release::useFile($this->versionFile);

    $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'ok')->assertJsonPath('version', '1.02.00.07');
});

test('a checkout that was never deployed has no release', function () {
    Release::useFile($this->versionFile.'-missing');

    $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('version', null);
});

test('only a version written as major.minor.patch.minipatch counts', function (string $content, ?string $expected) {
    file_put_contents($this->versionFile, $content);

    expect(Release::readFrom($this->versionFile))->toBe($expected);
})->with([
    'four parts' => ['{"version":"1.00.00.01"}', '1.00.00.01'],
    'past 99' => ['{"version":"12.10.03.100"}', '12.10.03.100'],
    'three parts' => ['{"version":"1.0.0"}', null],
    'unpadded' => ['{"version":"1.1.1.1"}', null],
    'not json' => ['1.00.00.01', null],
    'a number' => ['{"version":1}', null],
]);

test('the panel shows the API release', function () {
    file_put_contents($this->versionFile, json_encode(['version' => '1.00.03.12']));
    Release::useFile($this->versionFile);
    $this->signInAdmin(AdminRole::Owner);

    $this->getJson('/api/v1/admin/system')->assertOk()->assertJsonPath('version', '1.00.03.12');
});
