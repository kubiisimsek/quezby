<?php

namespace App\Support;

use UnexpectedValueException;

/**
 * Just enough DER (ITU-T X.690) to read what App Attest puts in an X.509
 * certificate that PHP's OpenSSL functions do not hand out: a walk over
 * tag-length-value elements, one level at a time, and object identifiers as
 * dotted text. Definite lengths and low tag numbers only, as certificates use.
 */
final class Der
{
    public const BOOLEAN = 0x01;

    public const BIT_STRING = 0x03;

    public const OCTET_STRING = 0x04;

    public const OBJECT_IDENTIFIER = 0x06;

    public const SEQUENCE = 0x30;

    /** A context-specific, constructed tag: `[n]` in ASN.1. */
    public static function context(int $number): int
    {
        return 0xA0 | $number;
    }

    /**
     * The elements `$data` holds side by side, each with its tag and its
     * value (the bytes inside it).
     *
     * @return list<array{tag: int, value: string}>
     *
     * @throws UnexpectedValueException
     */
    public static function elements(string $data): array
    {
        $elements = [];
        $end = strlen($data);
        $offset = 0;
        while ($offset < $end) {
            $tag = ord($data[$offset++]);
            if (($tag & 0x1F) === 0x1F) {
                throw new UnexpectedValueException('DER: high tag numbers are not read.');
            }
            if ($offset >= $end) {
                throw new UnexpectedValueException('DER: the data ends early.');
            }

            $length = ord($data[$offset++]);
            if ($length > 0x7F) {
                $size = $length & 0x7F;
                if ($size === 0 || $size > 4 || $size > $end - $offset) {
                    throw new UnexpectedValueException('DER: a length is indefinite, too long or cut off.');
                }
                $length = 0;
                for ($i = 0; $i < $size; $i++) {
                    $length = ($length << 8) | ord($data[$offset++]);
                }
            }
            if ($length > $end - $offset) {
                throw new UnexpectedValueException('DER: the data ends early.');
            }

            $elements[] = ['tag' => $tag, 'value' => substr($data, $offset, $length)];
            $offset += $length;
        }

        return $elements;
    }

    /**
     * The value of the one element `$data` is, which must have tag `$tag`.
     *
     * @throws UnexpectedValueException
     */
    public static function expect(string $data, int $tag): string
    {
        $elements = self::elements($data);
        if (count($elements) !== 1 || $elements[0]['tag'] !== $tag) {
            throw new UnexpectedValueException(sprintf('DER: expected one element tagged 0x%02X.', $tag));
        }

        return $elements[0]['value'];
    }

    /**
     * An OBJECT IDENTIFIER's value as dotted decimal, `1.2.840.113635.100.8.2`.
     *
     * @throws UnexpectedValueException
     */
    public static function oid(string $value): string
    {
        $arcs = [];
        $arc = 0;
        $open = false;
        foreach (str_split($value) as $char) {
            $byte = ord($char);
            if (! $open && $byte === 0x80) {
                throw new UnexpectedValueException('DER: an object identifier is not minimally encoded.');
            }
            if ($arc > PHP_INT_MAX >> 7) {
                throw new UnexpectedValueException('DER: an object identifier arc is too large.');
            }
            $arc = ($arc << 7) | ($byte & 0x7F);
            $open = ($byte & 0x80) !== 0;
            if (! $open) {
                $arcs[] = $arc;
                $arc = 0;
            }
        }
        if ($open || $arcs === []) {
            throw new UnexpectedValueException('DER: an object identifier is cut off.');
        }

        // The first number holds the first two arcs.
        $first = array_shift($arcs);
        $head = $first < 80 ? [intdiv($first, 40), $first % 40] : [2, $first - 80];

        return implode('.', [...$head, ...$arcs]);
    }
}
