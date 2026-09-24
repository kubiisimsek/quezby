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
