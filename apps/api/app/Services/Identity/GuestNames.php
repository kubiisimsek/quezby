<?php

namespace App\Services\Identity;

use App\Models\User;
use Closure;
use RuntimeException;

/**
 * The name a new account plays under until its player picks one:
 * `guest48128742` — `guest` and eight digits, which `Username` keeps from
 * players, so a picked name never looks like a given one. A hundred million
 * of them make a clash rare; a taken one is simply drawn again, and the
 * unique index settles the rare race after that.
 */
final class GuestNames
{
    private const ATTEMPTS = 5;

    /** @var Closure(): int */
    private readonly Closure $digits;

    /**
     * @param  (Closure(): int)|null  $digits  0 to 99 999 999; drawn at random unless a test decides
     */
    public function __construct(?Closure $digits = null)
    {
        $this->digits = $digits ?? static fn (): int => random_int(0, 99_999_999);
    }

    /** A name no player has right now. */
    public function mint(): string
    {
        for ($attempt = 0; $attempt < self::ATTEMPTS; $attempt++) {
            $name = sprintf('guest%08d', ($this->digits)());
            if (! User::query()->where('username', $name)->exists()) {
                return $name;
            }
        }

        throw new RuntimeException('No free guest name after '.self::ATTEMPTS.' draws.');
    }
}
