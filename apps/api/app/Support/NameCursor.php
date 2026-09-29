<?php

namespace App\Support;

/**
 * An opaque cursor for a list that pages A to Z by username: the last name
 * handed out. Usernames are unique, so the name alone fixes the order. The
 * app hands it back untouched (`?cursor=`).
 */
final class NameCursor
{
    public static function encode(string $username): string
    {
        return rtrim(strtr(base64_encode($username), '+/', '-_'), '=');
    }

    /** The username; null for anything that cannot be one (`Username`'s characters and length). */
    public static function decode(string $cursor): ?string
    {
        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        $length = '{'.Username::MIN_LENGTH.','.Username::MAX_LENGTH.'}';
        if ($decoded === false || preg_match('/^[a-z0-9.*]'.$length.'\z/', $decoded) !== 1) {
            return null;
        }

        return $decoded;
    }
}
