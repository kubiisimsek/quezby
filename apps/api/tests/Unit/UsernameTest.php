<?php

use App\Support\Username;
use App\Support\UsernameProblem;

/*
| The PHP username rules against `packages/config/fixtures/usernames.json`,
| which the TypeScript rules are tested against too.
*/

it('accepts', function (string $input, string $normalized) {
    $result = Username::validate($input);

    $this->assertTrue($result->ok);
    $this->assertSame($normalized, $result->normalized);
    $this->assertNull($result->problem);
})->with('valid usernames');

it('rejects', function (string $input, string $problem) {
    $result = Username::validate($input);

    $this->assertFalse($result->ok);
    $this->assertSame($problem, $result->problem?->value);
    $this->assertNull($result->normalized);
})->with('invalid usernames');

it('never lets two symbols touch, in any order', function () {
    foreach (['..', '**', '.*', '*.'] as $pair) {
        $this->assertSame(UsernameProblem::ConsecutiveSymbols, Username::validate("ab{$pair}cd")->problem);
    }
});

it('has a Turkish message for every problem and for taken', function () {
    foreach (UsernameProblem::cases() as $problem) {
        $this->assertNotSame('', $problem->message());
    }
    $this->assertSame('Bu kullanıcı adı alınmış.', Username::MESSAGES['taken']);
});

it('normalizes to lower case, so uniqueness ignores case', function () {
    $this->assertSame('kubi.01', Username::normalize('  KuBi.01 '));
});

it('keeps every guest-and-digits name for the API, however it is dotted', function () {
    foreach (['guest1', 'gu.est.123', 'misafir*2026', 'Guest48128742'] as $name) {
        $this->assertSame(UsernameProblem::Reserved, Username::validate($name)->problem);
    }
});

it('knows a name the API gave out', function (string $name, bool $automatic) {
    $this->assertSame($automatic, Username::isAutomatic($name));
})->with('automatic usernames');

it('never calls a missing name automatic', function () {
    $this->assertFalse(Username::isAutomatic(null));
});

it('trims exactly what JavaScript trims', function () {
    // No-break and ideographic spaces are whitespace to JavaScript's trim()…
    $this->assertSame('kubi', Username::validate("\u{00A0}kubi\u{3000}")->normalized);
    // …a zero-width space is not, so it stays and is refused.
    $this->assertSame(UsernameProblem::InvalidChar, Username::validate("\u{200B}kubi")->problem);
});

it('lower-cases the way JavaScript does', function () {
    // KELVIN SIGN lower-cases to a plain k in both languages.
    $this->assertSame('kubi', Username::validate("\u{212A}ubi")->normalized);
});

it('refuses bytes that are not UTF-8', function () {
    $this->assertSame(UsernameProblem::InvalidChar, Username::validate("kubi\xFF")->problem);
});
