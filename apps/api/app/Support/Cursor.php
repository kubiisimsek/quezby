<?php

namespace App\Support;

/**
 * An opaque cursor for a list that pages newest first: the moment of the last
 * row handed out and its id, so rows that share a moment still page in one
 * fixed order. The app hands it back untouched (`?cursor=`).
 */
final class Cursor
{
    public static function encode(string $at, string $id): string
    {
        return rtrim(strtr(base64_encode($at.'|'.$id), '+/', '-_'), '=');
    }

    /**
     * @return array{0: string, 1: string}|null The moment and the id; null for anything `encode()` did not write.
     */
    public static function decode(string $cursor): ?array
    {
        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($decoded === false || preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)\|([0-9a-z]{26})\z/', $decoded, $parts) !== 1) {
            return null;
        }

        return [$parts[1], $parts[2]];
    }
}
