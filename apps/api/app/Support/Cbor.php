<?php

namespace App\Support;

use UnexpectedValueException;

/**
 * A strict CBOR (RFC 8949) reader for what App Attest sends: unsigned and
 * negative integers, byte and text strings, arrays, maps and the simple
 * values false, true and null, every length definite. Anything else — tags,
 * floats, indefinite lengths, a map key twice, bytes left over — is refused
 * rather than guessed at: the input comes from a phone the API does not
 * trust yet. Byte and text strings both come back as PHP strings.
 */
final class Cbor
{
    /** Deeper than any attestation object nests. */
    private const MAX_DEPTH = 16;

    private int $offset = 0;

    private function __construct(private readonly string $data) {}

    /**
     * The one item `$data` encodes.
     *
     * @throws UnexpectedValueException when it is not exactly one well-formed item of the kinds above
     */
    public static function decode(string $data): mixed
    {
        $reader = new self($data);
        $value = $reader->item(0);
        if ($reader->offset !== strlen($data)) {
            throw new UnexpectedValueException('CBOR: bytes are left over after the item.');
        }

        return $value;
    }

    private function item(int $depth): mixed
    {
        if ($depth > self::MAX_DEPTH) {
            throw new UnexpectedValueException('CBOR: nested too deep.');
        }

        $initial = ord($this->take(1));
        $major = $initial >> 5;
        $info = $initial & 0x1F;

        if ($major === 6) {
            throw new UnexpectedValueException('CBOR: tags are not read.');
        }
        if ($major === 7) {
            return match ($info) {
                20 => false,
                21 => true,
                22 => null,
                default => throw new UnexpectedValueException('CBOR: of the simple values and floats, only false, true and null are read.'),
            };
        }

        $argument = $this->argument($info);

        return match ($major) {
            0 => $argument,
            1 => -1 - $argument,
            2 => $this->take($argument),
            3 => $this->text($argument),
            4 => $this->items($argument, $depth),
            default => $this->map($argument, $depth),
        };
    }

    /** The number an item's head carries: a value, a length or a count. */
    private function argument(int $info): int
    {
        if ($info < 24) {
            return $info;
        }
        $size = match ($info) {
            24 => 1,
            25 => 2,
            26 => 4,
            27 => 8,
            default => throw new UnexpectedValueException('CBOR: indefinite and reserved lengths are not read.'),
        };

        $bytes = $this->take($size);
        if ($size === 8 && ord($bytes[0]) > 0x7F) {
            throw new UnexpectedValueException('CBOR: the number is too large.');
        }
        $value = 0;
        for ($i = 0; $i < $size; $i++) {
            $value = ($value << 8) | ord($bytes[$i]);
        }

        return $value;
    }

    private function text(int $length): string
    {
        $text = $this->take($length);
        if (! mb_check_encoding($text, 'UTF-8')) {
            throw new UnexpectedValueException('CBOR: a text string is not UTF-8.');
        }

        return $text;
    }

    /** @return list<mixed> */
    private function items(int $count, int $depth): array
    {
        // Every item takes at least a byte: a count past what is left is a lie, not a loop to run.
        $this->expectItems($count, 1);
        $items = [];
        for ($i = 0; $i < $count; $i++) {
            $items[] = $this->item($depth + 1);
        }

        return $items;
    }

    /** @return array<int|string, mixed> */
    private function map(int $count, int $depth): array
    {
        $this->expectItems($count, 2);
        $map = [];
        for ($i = 0; $i < $count; $i++) {
            $key = $this->item($depth + 1);
            if (! is_int($key) && ! is_string($key)) {
                throw new UnexpectedValueException('CBOR: a map key must be a number or a string.');
            }
            if (array_key_exists($key, $map)) {
                throw new UnexpectedValueException('CBOR: a map has a key twice.');
            }
            $map[$key] = $this->item($depth + 1);
        }

        return $map;
    }

    private function expectItems(int $count, int $bytesEach): void
    {
        if ($count > intdiv(strlen($this->data) - $this->offset, $bytesEach)) {
            throw new UnexpectedValueException('CBOR: the data ends early.');
        }
    }

    private function take(int $length): string
    {
        if ($length > strlen($this->data) - $this->offset) {
            throw new UnexpectedValueException('CBOR: the data ends early.');
        }
        $bytes = substr($this->data, $this->offset, $length);
        $this->offset += $length;

        return $bytes;
    }
}
