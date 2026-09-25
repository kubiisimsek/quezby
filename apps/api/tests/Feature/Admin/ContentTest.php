<?php

use App\Content\Catalog;
use App\Enums\AdminRole;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->signInAdmin(AdminRole::Viewer);
    DB::table('content_stats')->insert([
        ['content_id' => 'like-001', 'shows' => 200, 'likes' => 150, 'misses' => 50],
        ['content_id' => 'like-002', 'shows' => 100, 'likes' => 90, 'misses' => 10],
        ['content_id' => 'skip-003', 'shows' => 1000, 'likes' => 0, 'misses' => 400],
    ]);
});

test('lists every post of the catalog, shown or not, most shown first', function () {
    $total = array_sum(Catalog::SIZES[Catalog::LATEST]);

    $this->getJson('/api/v1/admin/content')
        ->assertOk()
        ->assertJsonPath('contentVersion', Catalog::LATEST)
        ->assertJsonCount($total, 'items')
        ->assertJsonPath('items.0', ['contentId' => 'skip-003', 'kind' => 'skip', 'shows' => 1000, 'likes' => 0, 'misses' => 400, 'likeRate' => 0, 'missRate' => 400])
        ->assertJsonPath("items.{$total}", null)
        ->assertJsonPath('totals', ['shows' => 1300, 'likes' => 240, 'misses' => 460]);
});

test('says nothing of the rates of a post never shown', function () {
    $this->getJson('/api/v1/admin/content?kind=hold')
        ->assertJsonPath('items.0.shows', 0)
        ->assertJsonPath('items.0.likeRate', null)
        ->assertJsonPath('items.0.missRate', null);
});

test('filters by kind and sorts by a rate', function () {
    $this->getJson('/api/v1/admin/content?kind=like&sort=likeRate')
        ->assertJsonPath('items.0.contentId', 'like-002')
        ->assertJsonPath('items.0.likeRate', 900)
        ->assertJsonPath('items.1.contentId', 'like-001')
        ->assertJsonCount(Catalog::SIZES[Catalog::LATEST]['like'], 'items');

    $this->getJson('/api/v1/admin/content?sort=missRate')->assertJsonPath('items.0.contentId', 'skip-003');
});

test('refuses a kind or a sort it does not know', function (array $query) {
    $this->assertApiError($this->getJson('/api/v1/admin/content?'.http_build_query($query)), 422, 'validation_failed');
})->with([[['kind' => 'gold']], [['sort' => 'likes']]]);
