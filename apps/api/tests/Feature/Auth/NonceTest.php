<?php

use App\Services\Identity\NonceService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

it('issues a nonce that expires in ten minutes', function () {
    Carbon::setTestNow('2026-09-24 12:00:00.250');

    $response = $this->postJson('/api/v1/auth/nonce');

    $response->assertCreated()
        ->assertJsonPath('expiresAt', '2026-09-24T12:10:00.000Z');
    $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $response->json('nonce'));
    $this->assertDatabaseHas('auth_nonces', [
        'nonce' => $response->json('nonce'),
        'expires_at' => '2026-09-24 12:10:00',
        'used_at' => null,
    ]);
});

it('issues a different nonce every time, to anyone', function () {
    $nonces = collect(range(1, 5))->map(fn () => $this->postJson('/api/v1/auth/nonce')->assertCreated()->json('nonce'));

    $this->assertCount(5, $nonces->unique());
});

it('uses a nonce up once', function () {
    $nonces = app(NonceService::class);
    $nonce = $nonces->issue()['nonce'];

    $this->assertTrue($nonces->consume($nonce));
    $this->assertFalse($nonces->consume($nonce));
    $this->assertNotNull(DB::table('auth_nonces')->where('nonce', $nonce)->value('used_at'));
});

it('refuses a nonce it never issued, or one that expired', function () {
    $nonces = app(NonceService::class);
    $nonce = $nonces->issue()['nonce'];

    $this->assertFalse($nonces->consume(str_repeat('a', 64)));

    $this->travel(10)->minutes();
    $this->assertFalse($nonces->consume($nonce));
});

it('forgets nonces that expired', function () {
    $nonces = app(NonceService::class);
    $old = $nonces->issue()['nonce'];

    $this->travel(11)->minutes();
    $fresh = $nonces->issue()['nonce'];

    $this->assertDatabaseMissing('auth_nonces', ['nonce' => $old]);
    $this->assertDatabaseHas('auth_nonces', ['nonce' => $fresh]);
});

it('is throttled per IP', function () {
    for ($i = 0; $i < 20; $i++) {
        $this->postJson('/api/v1/auth/nonce')->assertCreated();
    }

    $this->assertApiError($this->postJson('/api/v1/auth/nonce'), 429, 'too_many_requests');
});
