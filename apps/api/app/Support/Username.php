<?php

namespace App\Support;

/**
 * Username rules — the PHP twin of `packages/config/src/username.ts`, tested
 * against the same `fixtures/usernames.json`. Same checks in the same order,
 * with JavaScript's `trim()` and `toLowerCase()` semantics.
 *
 *   - 3 to 20 characters: a–z, 0–9, `.` and `*`
 *   - starts and ends with a letter or a digit
 *   - `.` and `*` never touch each other
 *   - at least one letter
 *   - case-insensitive: stored and shown in lower case
 *   - `guest48128742`-like names are the API's: every new account gets one
 *     until its player picks a name (`GuestNames`)
 */
final class Username
{
    public const MIN_LENGTH = 3;

    public const MAX_LENGTH = 20;

    public const RESERVED = [
        'admin',
        'administrator',
        'anonim',
        'anonymous',
        'api',
        'destek',
        'guest',
        'guvenlik',
        'help',
        'me',
        'misafir',
        'mod',
        'moderator',
        'null',
        'official',
        'resmi',
        'root',
        'security',
        'staff',
        'support',
        'system',
        'undefined',
        'yardim',
        'yonetici',
    ];

    /** Nobody may pass for the game itself, however they spell around it. */
    private const RESERVED_FRAGMENTS = ['quezby'];

    /**
     * `guest` or `misafir` and nothing but digits, however it is dotted: the
     * API's to give out, so a name a player picked never looks like one it gave.
     */
    private const RESERVED_NUMBERED = '/^(guest|misafir)\d+\z/';

    /** The name a new account gets until its player picks one: `guest48128742`. */
    private const AUTOMATIC = '/^guest\d{8}\z/';

    /** Matched with the symbols taken out, so `o.r.o.s.p.u` is caught too. */
    private const BLOCKED_FRAGMENTS = [
        'orospu',
        'yarrak',
        'amcik',
        'sikerim',
        'siktir',
        'pezevenk',
        'fuck',
        'bitch',
        'cunt',
    ];

    public const MESSAGES = [
        'required' => 'Bir kullanıcı adı yaz.',
        'too_short' => 'En az 3 karakter olmalı.',
        'too_long' => 'En fazla 20 karakter olabilir.',
        'turkish_char' => 'Türkçe karakter kullanılamaz — ş yerine s, ı yerine i gibi.',
        'invalid_char' => 'Sadece harf, rakam, nokta (.) ve yıldız (*) kullanılabilir.',
        'bad_start' => 'Harf ya da rakamla başlamalı.',
        'bad_end' => 'Harf ya da rakamla bitmeli.',
        'consecutive_symbols' => 'Nokta ve yıldız art arda gelemez.',
        'no_letter' => 'En az bir harf içermeli.',
        'reserved' => 'Bu kullanıcı adı ayrılmış, başka bir tane dene.',
        'blocked' => 'Bu kullanıcı adı kullanılamaz.',
        'taken' => 'Bu kullanıcı adı alınmış.',
    ];

    /** Every code point JavaScript's `String.prototype.trim()` removes. */
    private const JS_WHITESPACE = '[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';

    public static function normalize(string $value): string
    {
        return self::lower(self::trim($value));
    }

    /** Whether this is still the name the API gave the account, not one its player picked. */
    public static function isAutomatic(?string $name): bool
    {
        return $name !== null && preg_match(self::AUTOMATIC, $name) === 1;
    }

    /**
     * Whether the player may still pick a name: only while it is the one the
     * API gave (or an account from before automatic names has none). A picked
     * name is theirs for good — `canPickUsername` in `@quezby/config`.
     */
    public static function isPickable(?string $name): bool
    {
        return $name === null || self::isAutomatic($name);
    }

    public static function validate(string $input): UsernameValidation
    {
        if (! mb_check_encoding($input, 'UTF-8')) {
            return UsernameValidation::invalid(UsernameProblem::InvalidChar);
        }

        $raw = self::trim($input);
        if ($raw === '') {
            return UsernameValidation::invalid(UsernameProblem::Required);
        }
        if (preg_match('/[çğıöşüÇĞİÖŞÜ]/u', $raw) === 1) {
            return UsernameValidation::invalid(UsernameProblem::TurkishChar);
        }

        $value = self::lower($raw);
        if (preg_match('/^[a-z0-9.*]+\z/', $value) !== 1) {
            return UsernameValidation::invalid(UsernameProblem::InvalidChar);
        }

        // Only ASCII is left from here on, so byte length is JavaScript's length.
        if (strlen($value) < self::MIN_LENGTH) {
            return UsernameValidation::invalid(UsernameProblem::TooShort);
        }
        if (strlen($value) > self::MAX_LENGTH) {
            return UsernameValidation::invalid(UsernameProblem::TooLong);
        }
        if (self::isSymbol($value[0])) {
            return UsernameValidation::invalid(UsernameProblem::BadStart);
        }
        if (self::isSymbol($value[strlen($value) - 1])) {
            return UsernameValidation::invalid(UsernameProblem::BadEnd);
        }
        if (preg_match('/[.*]{2}/', $value) === 1) {
            return UsernameValidation::invalid(UsernameProblem::ConsecutiveSymbols);
        }
        if (preg_match('/[a-z]/', $value) !== 1) {
            return UsernameValidation::invalid(UsernameProblem::NoLetter);
        }

        $bare = str_replace(['.', '*'], '', $value);
        if (
            in_array($value, self::RESERVED, true)
            || in_array($bare, self::RESERVED, true)
            || preg_match(self::RESERVED_NUMBERED, $bare) === 1
            || self::containsAny($bare, self::RESERVED_FRAGMENTS)
        ) {
            return UsernameValidation::invalid(UsernameProblem::Reserved);
        }
        if (self::containsAny($bare, self::BLOCKED_FRAGMENTS)) {
            return UsernameValidation::invalid(UsernameProblem::Blocked);
        }

        return UsernameValidation::valid($value);
    }

    private static function trim(string $value): string
    {
        $space = self::JS_WHITESPACE;

        return preg_replace("/^{$space}+|{$space}+\z/u", '', $value) ?? $value;
    }

    private static function lower(string $value): string
    {
        return mb_strtolower($value, 'UTF-8');
    }

    private static function isSymbol(string $char): bool
    {
        return $char === '.' || $char === '*';
    }

    /**
     * @param  list<string>  $fragments
     */
    private static function containsAny(string $haystack, array $fragments): bool
    {
        foreach ($fragments as $fragment) {
            if (str_contains($haystack, $fragment)) {
                return true;
            }
        }

        return false;
    }
}
