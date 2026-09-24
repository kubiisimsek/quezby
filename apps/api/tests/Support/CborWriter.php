<?php

namespace Tests\Support;

use InvalidArgumentException;

/**
 * Writes CBOR the way App Attest does, so the tests can build attestations
 * and assertions: PHP strings are text, `CborWriter::bytes()` marks a byte
 * string, lists are arrays and other arrays are maps.
 */
final class CborWriter
{
    /** A byte string, as opposed to text. */
    public static function bytes(string $bytes): object
    {
        return new class($bytes)
        {
            public function __construct(public readonly string $bytes) {}
        };
    }

    public static function encode(mixed $value): string
    {
        return match (true) {
            $value === false => "\xF4",
            $value === true => "\xF5",
            $value === null => "\xF6",
            is_int($value) && $value >= 0 => self::head(0, $value),
            is_int($value) => self::head(1, -1 - $value),
            is_string($value) => self::head(3, strlen($value)).$value,
            is_object($value) && property_exists($value, 'bytes') => self::head(2, strlen($value->bytes)).$value->bytes,
            is_array($value) && array_is_list($value) => self::head(4, count($value)).implode('', array_map(self::encode(...), $value)),
            is_array($value) => self::head(5, count($value)).implode('', array_map(
                fn (int|string $key) => self::encode($key).self::encode($value[$key]),
                array_keys($value),
            )),
            default => throw new InvalidArgumentException('CborWriter cannot write that.'),
        };
    }

    /** An item's head: its major type and its number, in the shortest form. */
    public static function head(int $major, int $number): string
    {
        $type = $major << 5;

        return match (true) {
            $number < 24 => chr($type | $number),
            $number <= 0xFF => chr($type | 24).chr($number),
            $number <= 0xFFFF => chr($type | 25).pack('n', $number),
            $number <= 0xFFFFFFFF => chr($type | 26).pack('N', $number),
            default => chr($type | 27).pack('J', $number),
        };
    }
}
