<?php

namespace App\Enums;

/** `AdminLogSource` in `packages/types`: where a log row comes from. */
enum LogSource: string
{
    /** An API request that ended in an error, or an exception. */
    case Api = 'api';
    /** A call to Firebase, Google or Apple that failed. */
    case External = 'external';
    /** What a push did: sent, or why not. */
    case Push = 'push';
    /** An error the phone sent in. */
    case App = 'app';
}
