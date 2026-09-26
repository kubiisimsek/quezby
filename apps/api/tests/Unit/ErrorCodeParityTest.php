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

it('names the follow cap, the configured one unless told', function () {
    expect(ErrorCode::FollowLimit->message())->toBe('En fazla 500 oyuncu takip edebilirsin.')
        ->and(ErrorCode::FollowLimit->message(['limit' => '2']))->toBe('En fazla 2 oyuncu takip edebilirsin.');

    config(['quezby.follows.limit' => 1500]);
    app()->setLocale('fr');
    expect(ErrorCode::FollowLimit->message())->toBe("Tu peux suivre 1\u{00A0}500 joueurs au maximum.");
});
