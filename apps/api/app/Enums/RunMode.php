<?php

namespace App\Enums;

enum RunMode: string
{
    /** Any number a day, on a fresh random seed. */
    case Free = 'free';

    /** "Günün akışı": one attempt a day, the same seed for everyone. */
    case Daily = 'daily';
}
