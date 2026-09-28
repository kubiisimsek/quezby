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

test('lists the catalog a page at a time, shown or not, most shown first', function () {
    $total = array_sum(Catalog::SIZES[Catalog::LATEST]);

    $this->getJson('/api/v1/admin/content')
        ->assertOk()
        ->assertJsonPath('contentVersion', Catalog::LATEST)
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 25)
        ->assertJsonPath('total', $total)
        ->assertJsonCount(min(25, $total), 'items')
        ->assertJsonPath('items.0', ['contentId' => 'skip-003', 'kind' => 'skip', 'shows' => 1000, 'likes' => 0, 'misses' => 400, 'likeRate' => 0, 'missRate' => 400])
        ->assertJsonPath('totals', ['shows' => 1300, 'likes' => 240, 'misses' => 460]);
});

test('turns the pages of the catalog, every post on one of them', function () {
    $total = array_sum(Catalog::SIZES[Catalog::LATEST]);
    $seen = [];
    for ($page = 1; ($page - 1) * 40 < $total; $page++) {
        $items = $this->getJson("/api/v1/admin/content?perPage=40&page={$page}")
            ->assertOk()
            ->assertJsonPath('page', $page)
            ->assertJsonPath('total', $total)
            ->json('items');
        $seen = [...$seen, ...array_column($items, 'contentId')];
    }

    expect($seen)->toHaveCount($total)->and(array_unique($seen))->toHaveCount($total);
    $this->getJson("/api/v1/admin/content?perPage=40&page={$page}")->assertJsonCount(0, 'items');
});

test('ranks the most missed and the most liked across every page, not just this one', function () {
    $this->getJson('/api/v1/admin/content?perPage=1&page=3')
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('topMissed.0.contentId', 'skip-003')
        ->assertJsonPath('topMissed.1.contentId', 'like-001')
        ->assertJsonPath('topMissed.2.contentId', 'like-002')
        ->assertJsonCount(3, 'topMissed')
        ->assertJsonPath('topLiked.0.contentId', 'like-002')
        ->assertJsonPath('topLiked.1.contentId', 'like-001')
        ->assertJsonCount(2, 'topLiked');
});

test('says nothing of the rates of a post never shown', function () {
    $this->getJson('/api/v1/admin/content?kind=hold')
        ->assertJsonPath('items.0.shows', 0)
        ->assertJsonPath('items.0.likeRate', null)
        ->assertJsonPath('items.0.missRate', null)
        ->assertJsonPath('topMissed', [])
        ->assertJsonPath('topLiked', []);
});

test('filters by kind and sorts by a rate', function () {
    $likes = Catalog::SIZES[Catalog::LATEST]['like'];

    $this->getJson('/api/v1/admin/content?kind=like&sort=likeRate')
        ->assertJsonPath('items.0.contentId', 'like-002')
        ->assertJsonPath('items.0.likeRate', 900)
        ->assertJsonPath('items.1.contentId', 'like-001')
        ->assertJsonPath('total', $likes)
        ->assertJsonPath('totals', ['shows' => 300, 'likes' => 240, 'misses' => 60]);

    $this->getJson('/api/v1/admin/content?sort=missRate')->assertJsonPath('items.0.contentId', 'skip-003');
});

test('refuses a kind, a sort or a page it does not know', function (array $query) {
    $this->assertApiError($this->getJson('/api/v1/admin/content?'.http_build_query($query)), 422, 'validation_failed');
})->with([[['kind' => 'gold']], [['sort' => 'likes']], [['page' => 0]], [['perPage' => 101]]]);
