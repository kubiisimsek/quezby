<?php

use App\Support\Cbor;
use Tests\Support\CborWriter;

/*
| The CBOR reader App Attest proofs go through. Vectors from RFC 8949,
| Appendix A, for every kind it reads; everything else is refused.
*/

it('reads what RFC 8949 encodes', function (string $hex, mixed $value) {
    expect(Cbor::decode((string) hex2bin($hex)))->toBe($value);
})->with([
    'zero' => ['00', 0],
    'one' => ['01', 1],
    'ten' => ['0a', 10],
    'twenty-three' => ['17', 23],
    'twenty-four' => ['1818', 24],
    'one hundred' => ['1864', 100],
    'a thousand' => ['1903e8', 1000],
    'a million' => ['1a000f4240', 1000000],
    'a trillion' => ['1b000000e8d4a51000', 1000000000000],
    'the largest PHP int' => ['1b7fffffffffffffff', PHP_INT_MAX],
    'minus one' => ['20', -1],
    'minus ten' => ['29', -10],
    'minus a hundred' => ['3863', -100],
    'minus a thousand' => ['3903e7', -1000],
    'the smallest PHP int' => ['3b7fffffffffffffff', PHP_INT_MIN],
    'no bytes' => ['40', ''],
    'four bytes' => ['4401020304', "\x01\x02\x03\x04"],
    'no text' => ['60', ''],
    'a' => ['6161', 'a'],
    'IETF' => ['6449455446', 'IETF'],
    'quote and backslash' => ['62225c', '"\\'],
    'u umlaut' => ['62c3bc', 'ü'],
    'water' => ['63e6b0b4', '水'],
    'an empty array' => ['80', []],
    'one two three' => ['83010203', [1, 2, 3]],
    'nested arrays' => ['8301820203820405', [1, [2, 3], [4, 5]]],
    'twenty-five items' => ['98190102030405060708090a0b0c0d0e0f101112131415161718181819', range(1, 25)],
    'an empty map' => ['a0', []],
    'a number map' => ['a201020304', [1 => 2, 3 => 4]],
    'a text map' => ['a26161016162820203', ['a' => 1, 'b' => [2, 3]]],
    'a map in an array' => ['826161a161626163', ['a', ['b' => 'c']]],
    'false' => ['f4', false],
    'true' => ['f5', true],
    'null' => ['f6', null],
]);

it('reads what the test writer writes', function () {
    $object = [
        'fmt' => 'apple-appattest',
        'attStmt' => ['x5c' => [CborWriter::bytes(random_bytes(300)), CborWriter::bytes(random_bytes(70000))], 'receipt' => CborWriter::bytes('r')],
        'authData' => CborWriter::bytes(str_repeat("\x01", 164)),
        -7 => [true, false, null, -70000, 4294967296],
    ];

    $read = Cbor::decode(CborWriter::encode($object));

    expect($read['fmt'])->toBe('apple-appattest')
        ->and($read['attStmt']['x5c'][0])->toBe($object['attStmt']['x5c'][0]->bytes)
        ->and(strlen($read['attStmt']['x5c'][1]))->toBe(70000)
        ->and($read['authData'])->toBe(str_repeat("\x01", 164))
        ->and($read[-7])->toBe([true, false, null, -70000, 4294967296]);
});

it('refuses what it does not read, or what is not CBOR', function (string $hex) {
    expect(fn () => Cbor::decode((string) hex2bin($hex)))->toThrow(UnexpectedValueException::class);
})->with([
    'nothing' => [''],
    'a number too large for PHP' => ['1bffffffffffffffff'],
    'a negative number too large for PHP' => ['3b8000000000000000'],
    'a reserved length' => ['1c'],
    'indefinite bytes' => ['5f42010243030405ff'],
    'indefinite text' => ['7f657374726561646d696e67ff'],
    'an indefinite array' => ['9f018202039f0405ffff'],
    'an indefinite map' => ['bf61610161629f0203ffff'],
    'a tag' => ['c074323031332d30332d32315432303a30343a30305a'],
    'a half float' => ['f93c00'],
    'a double' => ['fb3ff199999999999a'],
    'undefined' => ['f7'],
    'a simple value' => ['f0'],
    'a number cut short' => ['1903'],
    'bytes cut short' => ['44010203'],
    'text cut short' => ['64494554'],
    'an array cut short' => ['830102'],
    'a map cut short' => ['a2010203'],
    'text that is not UTF-8' => ['62c328'],
    'a key twice' => ['a201020103'],
    'an array as a key' => ['a1800102'],
    'bytes left over' => ['0000'],
    'a count past the data' => ['9affffffff'],
    'a length past the data' => ['5affffffff00'],
    'nested too deep' => [str_repeat('81', 17).'00'],
]);

it('reads nesting as deep as it allows', function () {
    expect(Cbor::decode((string) hex2bin(str_repeat('81', 16).'00')))->toBe(array_reduce(range(1, 16), fn ($inner) => [$inner], 0));
});
