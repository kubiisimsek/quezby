<?php

namespace App\Enums;

/**
 * The phrases a player can send a friend — `PHRASES` in `@quezby/config`,
 * tested against `packages/config/fixtures/social.json`. Each is said in the
 * receiver's language (`lang/{locale}/phrases.php`); no typed word is ever
 * sent. Codes are only ever added, never renamed.
 */
enum Phrase: string
{
    case Gg = 'gg';
    case Rematch = 'rematch';
    case BeatThat = 'beat_that';
    case Wow = 'wow';
    case CloseOne = 'close_one';
    case YourTurn = 'your_turn';
    case Daily = 'daily';
    case Hi = 'hi';
    case Thanks = 'thanks';
    case NextTime = 'next_time';

    /** The phrase in the current language. */
    public function text(): string
    {
        return __('phrases.'.$this->value);
    }
}
