<?php

namespace App\Enums;

/** `DeviceVerdict` in `packages/types`: how far the API trusts the phone a run is played on. */
enum DeviceVerdict: string
{
    /** Google Play Integrity or App Attest vouched for a real device running this app, unmodified. */
    case Pass = 'pass';

    /** The check came back against it: rooted, an emulator, a changed app. */
    case Fail = 'fail';

    /** No check could be made — no Google services, an old phone, the service down. Never stored. */
    case Unavailable = 'unavailable';
}
