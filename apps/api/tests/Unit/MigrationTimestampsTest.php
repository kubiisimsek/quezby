<?php

/*
| Shared hosting's MySQL may run without `explicit_defaults_for_timestamp`:
| there the first NOT NULL TIMESTAMP of a table defaults to CURRENT_TIMESTAMP
| and every other one to a zero date, which strict mode refuses (1067,
| "Invalid default value") — and SQLite, which the tests run on, never says
| so. A time that cannot be null is a `dateTime`; a `timestamp` is nullable
| or defaults to now.
*/

it('declares no NOT NULL timestamp column without a default', function () {
    $offenders = [];
    foreach (glob(dirname(__DIR__, 2).'/database/migrations/*.php') ?: [] as $file) {
        foreach (file($file) ?: [] as $number => $line) {
            if (preg_match('/->timestamp(Tz)?\(/', $line) === 1
                && preg_match('/->(nullable|useCurrent|default)\(/', $line) !== 1) {
                $offenders[] = basename($file).':'.($number + 1).'  '.trim($line);
            }
        }
    }

    expect($offenders)->toBe([]);
});
