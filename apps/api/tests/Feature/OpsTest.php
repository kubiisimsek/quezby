<?php

use App\Support\OpsToken;
use Illuminate\Support\Facades\Artisan;

const OPS_TOKEN = 'a-long-random-ops-token';

test('the ops routes do not exist without a token', function () {
    config(['quezby.ops_token' => '']);

    $this->assertApiError($this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => '']), 404, 'not_found');
    $this->assertApiError($this->postJson('/api/v1/ops/optimize'), 404, 'not_found');
});

test('a wrong or missing token is refused', function () {
    config(['quezby.ops_token' => OPS_TOKEN]);

    $this->assertApiError($this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => 'guess']), 401, 'unauthenticated');
    $this->assertApiError($this->postJson('/api/v1/ops/migrate'), 401, 'unauthenticated');
});

test('the right token runs the migrations', function () {
    config(['quezby.ops_token' => OPS_TOKEN]);

    $this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => OPS_TOKEN])
        ->assertOk()
        ->assertJsonPath('status', 'ok');
});

test('the right token rebuilds the caches', function () {
    config(['quezby.ops_token' => OPS_TOKEN]);
    // Really caching the config here would pin the test configuration for `php artisan serve`.
    Artisan::shouldReceive('call')->once()->with('optimize:clear', [])->andReturn(0);
    Artisan::shouldReceive('call')->once()->with('optimize', [])->andReturn(0);
    Artisan::shouldReceive('output')->twice()->andReturn("cleared\n", "cached\n");

    $this->postJson('/api/v1/ops/optimize', [], ['X-Ops-Token' => OPS_TOKEN])
        ->assertOk()
        ->assertExactJson(['status' => 'ok', 'output' => "cleared\ncached"]);
});

test('a failing command is reported to whoever holds the token', function () {
    config(['quezby.ops_token' => OPS_TOKEN]);
    Artisan::shouldReceive('call')->once()->andReturn(1);
    Artisan::shouldReceive('output')->once()->andReturn('SQLSTATE[HY000] [2002] Connection refused');

    $this->assertApiError($this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => OPS_TOKEN]), 500, 'server_error')
        ->assertJsonPath('error.message', 'migrate başarısız (çıkış kodu 1): SQLSTATE[HY000] [2002] Connection refused');
});

test('while the config is cached, the token is read live from the env file', function () {
    $file = (string) tempnam(sys_get_temp_dir(), 'quezby-env');
    file_put_contents($file, "APP_ENV=production\nOPS_TOKEN=\"from-the-file\"\n");

    try {
        $this->assertSame('configured', OpsToken::resolve(false, $file, 'configured'));
        $this->assertSame('from-the-file', OpsToken::resolve(true, $file, 'stale-in-the-cache'));

        file_put_contents($file, "APP_ENV=production\nOPS_TOKEN=\n");
        $this->assertSame('', OpsToken::resolve(true, $file, 'stale-in-the-cache'));
        $this->assertSame('', OpsToken::resolve(true, $file.'-missing', 'stale-in-the-cache'));
    } finally {
        unlink($file);
    }
});

test('guessing the token is throttled hard', function () {
    config(['quezby.ops_token' => OPS_TOKEN]);
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => "guess-{$i}"])->assertStatus(401);
    }

    $this->assertApiError($this->postJson('/api/v1/ops/migrate', [], ['X-Ops-Token' => OPS_TOKEN]), 429, 'too_many_requests');
});
