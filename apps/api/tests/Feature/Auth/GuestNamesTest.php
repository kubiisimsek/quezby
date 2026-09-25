<?php

use App\Models\User;
use App\Services\Identity\GuestNames;
use App\Support\Username;
use App\Support\UsernameProblem;

/*
| The name a new account plays under until its player picks one.
*/

it('mints guest and eight digits', function () {
    expect((new GuestNames(drawn(48128742)))->mint())->toBe('guest48128742')
        ->and((new GuestNames(drawn(7)))->mint())->toBe('guest00000007');
});

it('draws at random by default', function () {
    $names = new GuestNames;

    foreach (range(1, 20) as $ignored) {
        expect(Username::isAutomatic($names->mint()))->toBeTrue();
    }
});

it('mints a name no player could pick', function () {
    expect(Username::validate((new GuestNames)->mint())->problem)->toBe(UsernameProblem::Reserved);
});

it('moves past a taken name', function () {
    User::factory()->withUsername('guest00000007')->create();

    expect((new GuestNames(drawn(7, 8)))->mint())->toBe('guest00000008');
});

it('gives up after five taken names', function () {
    User::factory()->withUsername('guest00000007')->create();

    (new GuestNames(drawn(7)))->mint();
})->throws(RuntimeException::class);
