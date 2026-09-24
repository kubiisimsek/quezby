<?php

use App\Content\Catalog;
use App\Content\ContentPicker;
use App\Content\Mix;
use App\Game\ReelKind;

/*
| The API credits likes to the posts the player saw without asking the app:
| it makes the app's own pick. These are the fixtures `@quezby/config` wrote
| (`pnpm --filter @quezby/config fixtures`).
*/

function contentFixture(): array
{
    return sharedFixture('packages/config/fixtures/content.json');
}

it('hashes like the app', function () {
    foreach (contentFixture()['mix'] as ['seed' => $seed, 'index' => $index, 'salt' => $salt, 'value' => $value]) {
        expect(Mix::of($seed, $index, $salt))->toBe($value, "seed {$seed} reel {$index} salt {$salt}");
    }
});

it('picks the post the app showed', function () {
    foreach (contentFixture()['picks'] as ['seed' => $seed, 'index' => $index, 'kind' => $kind, 'version' => $version, 'id' => $id]) {
        expect(ContentPicker::postId($version, $seed, $index, ReelKind::from($kind)))->toBe($id);
    }
});

it('knows every catalog the app ships, list for list', function () {
    foreach (contentFixture()['catalogs'] as ['version' => $version, 'ids' => $ids]) {
        expect(Catalog::has($version))->toBeTrue();
        foreach ($ids as $kind => $list) {
            $kind = ReelKind::from($kind);
            expect(Catalog::size($version, $kind))->toBe(count($list));
            foreach ($list as $position => $id) {
                expect(Catalog::idOf($kind, $position))->toBe($id);
            }
        }
    }
});

it('refuses a catalog it does not know', function () {
    Catalog::size(99, ReelKind::Skip);
})->throws(InvalidArgumentException::class);
