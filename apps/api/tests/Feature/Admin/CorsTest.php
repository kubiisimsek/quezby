<?php

/*
| The admin panel lives on another origin and sends a bearer token, so every
| call starts with a preflight; its answer is remembered for two hours.
*/

test('answers the admin panel\'s preflight and lets the browser remember it', function () {
    $this->call('OPTIONS', '/api/v1/admin/overview', server: [
        'HTTP_ORIGIN' => 'https://admin.quezby.com',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization',
    ])
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', '*')
        ->assertHeader('Access-Control-Max-Age', '7200');
});

test('sends no cookies across origins', function () {
    expect(config('cors.supports_credentials'))->toBeFalse();
});
