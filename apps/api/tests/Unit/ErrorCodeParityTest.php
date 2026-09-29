<?php

use App\Enums\ErrorCode;

/*
| Every error code the API answers with is one the app knows: `ErrorCode`
| and `ApiErrorCode` in `packages/types/src/index.ts` are one list.
*/

it('answers with exactly the error codes of the contract', function () {
    $types = (string) file_get_contents(dirname(__DIR__, 4).'/packages/types/src/index.ts');
    preg_match('/export type ApiErrorCode =(.*?);/s', $types, $union);
    preg_match_all("/\\|\\s*'([a-z_]+)'/", $union[1] ?? '', $codes);

    expect($codes[1])->not->toBeEmpty()
        ->and(collect(ErrorCode::cases())->map->value->sort()->values()->all())
        ->toBe(collect($codes[1])->sort()->values()->all());
});

it('says a device proof problem the way the contract does', function (ErrorCode $code, int $status) {
    expect($code->status())->toBe($status)
        ->and($code->message())->not->toBe('');
})->with([
    [ErrorCode::ChallengeInvalid, 422],
    [ErrorCode::IntegrityInvalid, 422],
    [ErrorCode::AttestKeyUnknown, 409],
]);

it('refuses a second name as a conflict', function () {
    expect(ErrorCode::UsernameLocked->status())->toBe(409)
        ->and(ErrorCode::UsernameLocked->message())->toBe('Kullanıcı adını zaten seçtin; seçilen ad değişmez.');
});

it('forbids an admin a role may not use with its own code', function () {
    expect(ErrorCode::Forbidden->status())->toBe(403)
        ->and(ErrorCode::Forbidden->message())->toBe('Bu işlem için yetkin yok.');
});

it('hides a friend list from anyone but the player and their friends as a 403', function () {
    expect(ErrorCode::FriendsHidden->status())->toBe(403)
        ->and(ErrorCode::FriendsHidden->message())->toBe('Bu listeyi yalnızca arkadaşları görebilir.');
});

it('names each cap, the configured one unless told', function () {
    expect(ErrorCode::FriendLimit->message())->toBe('En fazla 500 arkadaşın olabilir.')
        ->and(ErrorCode::FriendLimit->message(['limit' => '2']))->toBe('En fazla 2 arkadaşın olabilir.')
        ->and(ErrorCode::RequestLimit->message())->toStartWith('Cevap bekleyen en fazla 100 isteğin olabilir.')
        ->and(ErrorCode::MessageLimit->message())->toBe('Bu arkadaşına bugün en fazla 20 mesaj gönderebilirsin.')
        ->and(ErrorCode::DuelLimit->message())->toBe("Cevap bekleyen en fazla 20 VS'in olabilir.");

    config(['quezby.friends.limit' => 1500]);
    app()->setLocale('fr');
    expect(ErrorCode::FriendLimit->message())->toBe("Tu peux avoir 1\u{00A0}500 amis au maximum.");
});

it('keeps a VS that can no longer be played a conflict', function () {
    expect(ErrorCode::DuelUnavailable->status())->toBe(409)
        ->and(ErrorCode::NotFriends->status())->toBe(422)
        ->and(ErrorCode::PhotoInvalid->status())->toBe(422);
});
