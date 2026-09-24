<?php

/*
| Every device endpoint, and a run's checkpoint, is for a signed-in player.
*/

it('needs a signed-in player', function (string $path) {
    $this->assertApiError($this->postJson($path, []), 401, 'unauthenticated');
})->with([
    '/api/v1/device/challenge',
    '/api/v1/device/android',
    '/api/v1/device/ios/attest',
    '/api/v1/device/ios/assert',
    '/api/v1/runs/01jzzzzzzzzzzzzzzzzzzzzzzz/checkpoint',
]);
