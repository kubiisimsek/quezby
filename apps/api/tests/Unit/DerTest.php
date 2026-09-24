<?php

use App\Support\Der;

/*
| The DER walk the App Attest nonce is read with.
*/

it('walks elements one level at a time', function () {
    // SEQUENCE { INTEGER 5, [1] { OCTET STRING "ab" } }, then a NULL beside it.
    $data = (string) hex2bin('3009020105a10404026162'.'0500');

    $top = Der::elements($data);
    expect($top)->toBe([
        ['tag' => Der::SEQUENCE, 'value' => (string) hex2bin('020105a10404026162')],
        ['tag' => 0x05, 'value' => ''],
    ]);

    $inside = Der::elements($top[0]['value']);
    expect($inside[0])->toBe(['tag' => 0x02, 'value' => "\x05"])
        ->and($inside[1]['tag'])->toBe(Der::context(1))
        ->and(Der::expect($inside[1]['value'], Der::OCTET_STRING))->toBe('ab');
});

it('reads long lengths', function () {
    $value = str_repeat('x', 300);

    expect(Der::expect("\x04\x82\x01\x2C".$value, Der::OCTET_STRING))->toBe($value)
        ->and(Der::expect("\x04\x81\x80".str_repeat('y', 128), Der::OCTET_STRING))->toBe(str_repeat('y', 128));
});

it('writes object identifiers as dotted decimal', function (string $hex, string $oid) {
    expect(Der::oid((string) hex2bin($hex)))->toBe($oid);
})->with([
    "App Attest's nonce" => ['2a864886f763640802', '1.2.840.113635.100.8.2'],
    'EC public key' => ['2a8648ce3d0201', '1.2.840.10045.2.1'],
    'P-256' => ['2a8648ce3d030107', '1.2.840.10045.3.1.7'],
    'common name' => ['550403', '2.5.4.3'],
    'a first arc of 2 past 39' => ['8837', '2.999'],
]);

it('refuses what is not DER it reads', function (Closure $read) {
    expect($read)->toThrow(UnexpectedValueException::class);
})->with([
    'a tag with no length' => [fn () => Der::elements("\x30")],
    'a value cut short' => [fn () => Der::elements("\x04\x05abc")],
    'an indefinite length' => [fn () => Der::elements("\x30\x80\x00\x00")],
    'a length of five bytes' => [fn () => Der::elements("\x04\x85\x00\x00\x00\x00\x01a")],
    'a long length cut short' => [fn () => Der::elements("\x04\x82\x01")],
    'a high tag number' => [fn () => Der::elements("\x1F\x81\x00\x00")],
    'another tag than expected' => [fn () => Der::expect("\x04\x00", Der::SEQUENCE)],
    'two elements where one was expected' => [fn () => Der::expect("\x04\x00\x04\x00", Der::OCTET_STRING)],
    'nothing where one was expected' => [fn () => Der::expect('', Der::OCTET_STRING)],
    'an empty identifier' => [fn () => Der::oid('')],
    'an identifier cut short' => [fn () => Der::oid("\x2A\x86")],
    'an identifier padded with 0x80' => [fn () => Der::oid("\x2A\x80\x01")],
    'an identifier arc too large' => [fn () => Der::oid("\x2A".str_repeat("\xFF", 10)."\x7F")],
]);
