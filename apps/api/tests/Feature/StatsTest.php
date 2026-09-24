<?php

/*
| `GET /me/stats`: lifetime numbers, straight from the server's replays.
| (What a run adds is covered in Feature/Runs/FinishRunTest.)
*/

test('a new player has zeroes and no favourites', function () {
    $this->signIn();

    $this->getJson('/api/v1/me/stats')->assertOk()->assertExactJson([
        'stats' => [
            'runs' => 0, 'reels' => 0, 'swipes' => 0, 'likes' => 0, 'holds' => 0, 'perfects' => 0,
            'freezes' => 0, 'caught' => 0, 'misses' => 0, 'activeMs' => 0, 'bestReactionMs' => null,
            'maxCombo' => 1000,
            'bonuses' => ['flawless' => 0, 'lightning' => 0, 'coolHead' => 0, 'comeback' => 0],
        ],
        'topLiked' => [],
    ]);
});

test('stats need a player and are throttled', function () {
    $this->assertApiError($this->getJson('/api/v1/me/stats'), 401, 'unauthenticated');

    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/me/stats')->assertOk();
    }
    $this->assertApiError($this->getJson('/api/v1/me/stats'), 429, 'too_many_requests');
});
