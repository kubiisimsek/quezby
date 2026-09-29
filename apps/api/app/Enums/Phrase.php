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
    case Hi = 'hi';
    case WhatsUp = 'whats_up';
    case Gg = 'gg';
    case GgWp = 'gg_wp';
    case Rematch = 'rematch';
    case YourTurn = 'your_turn';
    case BeatThat = 'beat_that';
    case Ready = 'ready';
    case Wow = 'wow';
    case CloseOne = 'close_one';
    case Clutch = 'clutch';
    case Ez = 'ez';
    case Bot = 'bot';
    case Nerf = 'nerf';
    case Lucky = 'lucky';
    case Lag = 'lag';
    case WarmingUp = 'warming_up';
    case RageQuit = 'rage_quit';
    case Respect = 'respect';
    case Afk = 'afk';
    case Daily = 'daily';
    case Thanks = 'thanks';
    case NextTime = 'next_time';
    case Bye = 'bye';

    /** The phrase in the current language. */
    public function text(): string
    {
        return __('phrases.'.$this->value);
    }
}
