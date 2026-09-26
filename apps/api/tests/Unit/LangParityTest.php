<?php

use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Support\UsernameProblem;
use Illuminate\Support\Arr;
use Illuminate\Translation\MessageSelector;

/*
| Every line the API says is in all six languages (`lang/{locale}`): the
| same files, the same keys, the same placeholders — and a counted line has
| as many forms as its language counts with.
*/

/**
 * The file groups of `lang/tr`, the source language: `errors`, `share`…
 *
 * @return list<string>
 */
function langGroups(): array
{
    $files = glob(dirname(__DIR__, 2).'/lang/tr/*.php') ?: [];

    return array_map(fn (string $file) => basename($file, '.php'), $files);
}

/**
 * One language's lines of a group, flattened: `max.string` => '…'.
 *
 * @return array<string, mixed>
 */
function langLines(Locale $locale, string $group): array
{
    $file = dirname(__DIR__, 2)."/lang/{$locale->value}/{$group}.php";

    return is_file($file) ? Arr::dot(require $file) : [];
}

/**
 * The placeholders a line fills, by name — `:Attribute` and `:attribute`
 * are the same one, cased for where it stands.
 *
 * @return list<string>
 */
function langPlaceholders(string $line): array
{
    preg_match_all('/:([A-Za-z_]+)/', $line, $names);
    $names = array_unique(array_map('strtolower', $names[1]));
    sort($names);

    return $names;
}

/** How many forms a counted line has in `$locale`: one more than the highest form Laravel picks. */
function langForms(Locale $locale): int
{
    $selector = new MessageSelector;

    return max(array_map(fn (int $count) => $selector->getPluralIndex($locale->value, $count), range(0, 1000))) + 1;
}

/**
 * Whether a line is counted (`trans_choice`): in some language it has forms.
 */
function langIsCounted(string $group, string $key): bool
{
    foreach (Locale::cases() as $locale) {
        if (str_contains((string) (langLines($locale, $group)[$key] ?? ''), '|')) {
            return true;
        }
    }

    return false;
}

it('has the same files in every language', function (Locale $locale) {
    $files = glob(dirname(__DIR__, 2)."/lang/{$locale->value}/*.php") ?: [];

    expect(langGroups())->not->toBeEmpty()
        ->and(array_map(fn (string $file) => basename($file, '.php'), $files))->toBe(langGroups());
})->with(Locale::cases());

it('has the same lines in every language', function (Locale $locale) {
    foreach (langGroups() as $group) {
        expect(array_keys(langLines($locale, $group)))->toBe(array_keys(langLines(Locale::Tr, $group)), "{$locale->value}/{$group}.php");
    }
})->with(Locale::cases());

it('fills the same placeholders in every language, and never says nothing', function (Locale $locale) {
    foreach (langGroups() as $group) {
        foreach (langLines(Locale::Tr, $group) as $key => $source) {
            $line = langLines($locale, $group)[$key] ?? null;

            expect($line)->toBeString("{$locale->value}/{$group}.php: {$key}");
            foreach (explode('|', $line) as $form) {
                expect(trim($form))->not->toBe('', "{$locale->value}/{$group}.php: {$key}");
            }
            expect(langPlaceholders($line))->toBe(langPlaceholders($source), "{$locale->value}/{$group}.php: {$key}");
        }
    }
})->with(Locale::cases());

it('counts with as many forms as the language has', function (Locale $locale) {
    foreach (langGroups() as $group) {
        foreach (langLines($locale, $group) as $key => $line) {
            $forms = langIsCounted($group, $key) ? langForms($locale) : 1;

            expect(count(explode('|', $line)))->toBe($forms, "{$locale->value}/{$group}.php: {$key}");
        }
    }
})->with(Locale::cases());

it('knows the forms of each language', function () {
    expect(array_map(fn (Locale $locale) => langForms($locale), Locale::cases()))->toBe([1, 2, 2, 6, 2, 2])
        // Turkish says "1 puan" as it says "3 puan": the other languages show which lines count.
        ->and(langIsCounted('share', 'points'))->toBeTrue()
        ->and(langIsCounted('share', 'posts'))->toBeTrue()
        ->and(langIsCounted('share', 'free'))->toBeFalse();
});

it('has a line for every error code', function (Locale $locale) {
    $lines = langLines($locale, 'errors');

    foreach (ErrorCode::cases() as $code) {
        expect($lines)->toHaveKey($code->value);
    }
})->with(Locale::cases());

it('says every username problem, and a name taken', function (Locale $locale) {
    $lines = langLines($locale, 'username');

    foreach (UsernameProblem::cases() as $problem) {
        expect($lines)->toHaveKey($problem->value);
    }
    expect($lines)->toHaveKey('taken');
})->with(Locale::cases());

it('starts every line of an Arabic share text right to left', function () {
    foreach (langLines(Locale::Ar, 'share') as $key => $line) {
        if (langIsCounted('share', $key)) {
            continue; // A counted word stands inside a line, never at its start.
        }
        foreach (explode("\n", $line) as $row) {
            expect(mb_substr($row, 0, 1))->toBe("\u{200F}", "ar/share.php: {$key}");
        }
    }
});

it('marks no other language right to left', function (Locale $locale) {
    foreach (langGroups() as $group) {
        foreach (langLines($locale, $group) as $key => $line) {
            expect($line)->not->toContain("\u{200F}", "{$locale->value}/{$group}.php: {$key}");
        }
    }
})->with(array_filter(Locale::cases(), fn (Locale $locale) => ! $locale->isRtl()));

it('keeps a no-break space before French punctuation', function () {
    foreach (langGroups() as $group) {
        foreach (langLines(Locale::Fr, $group) as $key => $line) {
            // `:` opens a placeholder when a letter follows it.
            expect(preg_match('/(?<!\x{00A0})(?:[!?;%]|:(?![A-Za-z_]))/u', $line))->toBe(0, "fr/{$group}.php: {$key}");
        }
    }
});
