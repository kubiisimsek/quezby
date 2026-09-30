<?php

use App\Enums\Locale;
use Illuminate\Http\Request;
use Illuminate\Translation\MessageSelector;

/*
| The eight languages are one list on each side — `App\Enums\Locale`, the
| `Locale` union of `packages/types` and `LOCALES` in `@quezby/config` —
| and the API groups digits, counts and reads a phone's languages the way
| the app does: the vectors of `packages/config/fixtures/locales.json`.
*/

/**
 * @return array<string, mixed>
 */
function localesFixture(): array
{
    return sharedFixture('packages/config/fixtures/locales.json');
}

/**
 * A request whose `Accept-Language` names `$tags`, in that order — none at
 * all for an empty list (`Request::create()` would send `en-us` by itself).
 *
 * @param  list<string>  $tags
 */
function requestAccepting(array $tags): Request
{
    $request = Request::create('/api/v1/health');
    $request->headers->remove('Accept-Language');
    if ($tags !== []) {
        $request->headers->set('Accept-Language', implode(', ', $tags));
    }

    return $request;
}

it('speaks the languages of the contract, in its order', function () {
    $types = (string) file_get_contents(dirname(__DIR__, 4).'/packages/types/src/index.ts');
    preg_match('/export type Locale =(.*?);/s', $types, $union);
    preg_match_all("/'([a-z]+)'/", $union[1] ?? '', $locales);

    expect($locales[1])->not->toBeEmpty()
        ->toBe(array_map(fn (Locale $locale) => $locale->value, Locale::cases()));
});

it('speaks the languages of the config, in its order', function () {
    expect(localesFixture()['locales'])->toBe(array_map(fn (Locale $locale) => $locale->value, Locale::cases()));
});

it('reads only Arabic right to left', function () {
    $rtl = array_values(array_filter(Locale::cases(), fn (Locale $locale) => $locale->isRtl()));

    expect(array_map(fn (Locale $locale) => $locale->value, $rtl))->toBe(localesFixture()['rtl']);
});

it('groups digits the way the app does', function (string $locale, int $value, string $text) {
    expect(Locale::from($locale)->group($value))->toBe($text);
})->with(fn () => array_map(
    fn (array $vector) => [$vector['locale'], $vector['value'], $vector['text']],
    localesFixture()['groups'],
));

it('counts with the form the app picks', function (string $locale, int $count, int $index) {
    expect((new MessageSelector)->getPluralIndex($locale, $count))->toBe($index);
})->with(fn () => array_map(
    fn (array $vector) => [$vector['locale'], $vector['count'], $vector['index']],
    localesFixture()['plurals'],
));

it('picks the language a phone asks for the way the app does', function (array $tags, ?string $locale) {
    expect(Locale::fromHeader(requestAccepting($tags))?->value)->toBe($locale);
})->with(fn () => array_map(
    fn (array $vector) => [$vector['tags'], $vector['locale']],
    localesFixture()['tags'],
));

it('passes over a language it does not speak for one further down', function () {
    expect(Locale::fromHeader(requestAccepting(['zh-CN', 'pt-BR;q=0.9', 'ar;q=0.8', 'de;q=0.7'])))->toBe(Locale::Ar)
        ->and(Locale::fromHeader(requestAccepting(['*'])))->toBeNull();
});

it('orders the languages by their quality, not their place', function () {
    expect(Locale::fromHeader(requestAccepting(['en;q=0.5', 'fr;q=0.9'])))->toBe(Locale::Fr);
});

it('speaks Turkish outside a request that says otherwise', function () {
    expect(Locale::current())->toBe(Locale::Tr);

    app()->setLocale('ar');
    expect(Locale::current())->toBe(Locale::Ar);

    app()->setLocale('ja');
    expect(Locale::current())->toBe(Locale::Ja);

    app()->setLocale('zh');
    expect(Locale::current())->toBe(Locale::Tr);
});
