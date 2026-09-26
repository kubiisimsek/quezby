<?php

namespace App\Support;

/** Why a username cannot be had — the `UsernameProblem` codes of `@quezby/config`. */
enum UsernameProblem: string
{
    case Required = 'required';
    case TooShort = 'too_short';
    case TooLong = 'too_long';
    case TurkishChar = 'turkish_char';
    case InvalidChar = 'invalid_char';
    case BadStart = 'bad_start';
    case BadEnd = 'bad_end';
    case ConsecutiveSymbols = 'consecutive_symbols';
    case NoLetter = 'no_letter';
    case Reserved = 'reserved';
    case Blocked = 'blocked';

    /**
     * What the player reads under the field, in the request's language:
     * `lang/{locale}/username.php`, the same words as the app's catalogs.
     */
    public function message(): string
    {
        return __('username.'.$this->value);
    }
}
