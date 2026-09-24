<?php

/*
| `packages/config/fixtures/usernames.json`, which the TypeScript rules are
| tested against too. A case is named by its input, JSON-encoded so blank and
| padded names stay visible.
*/

dataset('valid usernames', function () {
    foreach (sharedFixture('packages/config/fixtures/usernames.json')['valid'] as $case) {
        yield json_encode($case['input'], JSON_UNESCAPED_UNICODE) => [$case['input'], $case['normalized']];
    }
});

dataset('invalid usernames', function () {
    foreach (sharedFixture('packages/config/fixtures/usernames.json')['invalid'] as $case) {
        yield json_encode($case['input'], JSON_UNESCAPED_UNICODE) => [$case['input'], $case['problem']];
    }
});
