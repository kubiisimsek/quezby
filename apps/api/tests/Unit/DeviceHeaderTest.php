<?php

use App\Enums\Platform;
use App\Support\DeviceHeader;

/*
| `X-Device`, as `deviceHeader` in `@quezby/sdk` writes it. The phone's word
| is only a label: cleaned, cut to its column, and nothing without a sound
| install id.
*/

it('reads what the app writes', function () {
    $device = DeviceHeader::parse('install=c0ffee00c0ffee00; platform=ios; os=18.2; brand=Apple; model=iPhone%2015%20Pro; build=42');

    expect($device)->not->toBeNull()
        ->and($device->installId)->toBe('c0ffee00c0ffee00')
        ->and($device->platform)->toBe(Platform::Ios)
        ->and($device->os)->toBe('18.2')
        ->and($device->brand)->toBe('Apple')
        ->and($device->model)->toBe('iPhone 15 Pro')
        ->and($device->build)->toBe('42');
});

it('takes the fields in any order and leaves out what is missing', function () {
    $device = DeviceHeader::parse('model=Pixel%208;install=0123456789abcdef');

    expect($device?->installId)->toBe('0123456789abcdef')
        ->and($device?->model)->toBe('Pixel 8')
        ->and($device?->platform)->toBeNull()
        ->and($device?->os)->toBeNull()
        ->and($device?->brand)->toBeNull()
        ->and($device?->build)->toBeNull();
});

it('cleans a label to printable ASCII and cuts it to its column', function () {
    $device = DeviceHeader::parse('install=0123456789abcdef; platform=symbian; model='.rawurlencode("Galaxy\x00  S24\n☃ Ultra").'; os='.str_repeat('9', 40));

    expect($device?->platform)->toBeNull()
        ->and($device?->model)->toBe('Galaxy S24 Ultra')
        ->and($device?->os)->toBe(str_repeat('9', 32));
});

it('names a maker one way, however the system spells it', function (string $brand, ?string $named) {
    expect(DeviceHeader::parse('install=0123456789abcdef; brand='.rawurlencode($brand))?->brand)->toBe($named);
})->with([
    'Android, in lower case' => ['samsung', 'Samsung'],
    'two words' => ['general mobile', 'General Mobile'],
    'as the maker writes it' => ['Xiaomi', 'Xiaomi'],
    'in capitals' => ['HUAWEI', 'HUAWEI'],
    'the library knows nothing' => ['unknown', null],
    'nothing printable' => ["\u{2603}", null],
    'too long' => [str_repeat('b', 40), 'B'.str_repeat('b', 31)],
]);

it('is no header without a sound install id', function (mixed $header) {
    expect(DeviceHeader::parse($header))->toBeNull();
})->with([
    'nothing' => [null],
    'empty' => [''],
    'no install' => ['platform=ios; os=18.2'],
    'too short' => ['install=abc'],
    'a slash in it' => ['install=abcdefgh%2F12'],
    'a novel' => ['install=0123456789abcdef; model='.str_repeat('x', 2000)],
]);
