<?php

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

test('check answers for the normalized name', function () {
    $this->signIn();

    $this->getJson('/api/v1/usernames/check?username='.urlencode('  Kubi.01 '))
        ->assertOk()
        ->assertExactJson(['username' => 'kubi.01', 'available' => true, 'reason' => null]);
});

test('check reports a taken name, whatever its case', function () {
    User::factory()->withUsername('kubi')->create();
    $this->signIn();

    $this->getJson('/api/v1/usernames/check?username=KUBI')
        ->assertOk()
        ->assertExactJson(['username' => 'kubi', 'available' => false, 'reason' => 'taken']);
});

test("check calls the player's own name available", function () {
    $this->signIn(User::factory()->withUsername('kubi')->create());

    $this->getJson('/api/v1/usernames/check?username=kubi')->assertJsonPath('available', true);
});

test('check reports the first problem', function () {
    $this->signIn();

    $this->getJson('/api/v1/usernames/check?username=AB')
        ->assertExactJson(['username' => 'ab', 'available' => false, 'reason' => 'too_short']);
    $this->getJson('/api/v1/usernames/check?username='.urlencode('Şule'))
        ->assertExactJson(['username' => 'şule', 'available' => false, 'reason' => 'turkish_char']);
    $this->getJson('/api/v1/usernames/check')
        ->assertExactJson(['username' => '', 'available' => false, 'reason' => 'required']);
});

test('check is throttled', function () {
    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/usernames/check?username=kubi')->assertOk();
    }

    $this->assertApiError($this->getJson('/api/v1/usernames/check?username=kubi'), 429, 'too_many_requests');
});

test('a player picks a name, stored in lower case', function () {
    $user = $this->signIn(User::factory()->create());

    $this->putJson('/api/v1/me/username', ['username' => ' Kubi.01 '])
        ->assertOk()
        ->assertJsonPath('user.username', 'kubi.01');
    $this->assertSame('kubi.01', $user->fresh()->username);

    // Picking the same name again changes nothing.
    $this->putJson('/api/v1/me/username', ['username' => 'KUBI.01'])->assertOk();
});

test('a name the rules refuse is username_invalid, with the problem', function () {
    $this->signIn();

    $response = $this->putJson('/api/v1/me/username', ['username' => 'ab']);

    $this->assertApiError($response, 422, 'username_invalid')
        ->assertJsonPath('error.fields', ['username' => ['too_short']])
        ->assertJsonPath('error.message', 'En az 3 karakter olmalı.');
    $this->assertApiError($this->putJson('/api/v1/me/username', ['username' => 'the.quezby.team']), 422, 'username_invalid')
        ->assertJsonPath('error.fields.username', ['reserved']);
    $this->assertApiError($this->putJson('/api/v1/me/username', []), 422, 'username_invalid')
        ->assertJsonPath('error.fields.username', ['required']);
});

test('a player on an automatic name picks a name of their own', function () {
    $user = $this->signIn(User::factory()->withUsername('guest00000007')->create());

    $this->putJson('/api/v1/me/username', ['username' => 'ekin.su'])
        ->assertOk()
        ->assertJsonPath('user.username', 'ekin.su');
    $this->assertSame('ekin.su', $user->fresh()->username);
});

test('a player cannot pick a name that looks automatic', function () {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/username', ['username' => 'guest12345678']), 422, 'username_invalid')
        ->assertJsonPath('error.fields.username', ['reserved']);
    $this->getJson('/api/v1/usernames/check?username=Misafir.2026')
        ->assertExactJson(['username' => 'misafir.2026', 'available' => false, 'reason' => 'reserved']);
});

test('a name that is not a string fails validation', function () {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/username', ['username' => 123]), 422, 'validation_failed');
});

test('a taken name is a conflict, whatever its case', function () {
    User::factory()->withUsername('kubi')->create();
    $user = $this->signIn(User::factory()->create());

    $this->assertApiError($this->putJson('/api/v1/me/username', ['username' => 'KuBi']), 409, 'username_taken')
        ->assertJsonPath('error.message', 'Bu kullanıcı adı alınmış.');
    $this->assertNull($user->fresh()->username);
});

test('the database holds one player per name', function () {
    User::factory()->withUsername('kubi')->create();

    User::factory()->withUsername('kubi')->create();
})->throws(UniqueConstraintViolationException::class);
