<?php

namespace App\Enums;

/** `open` until a moderator removes what it was about (`resolved`) or lets it be (`dismissed`). */
enum ReportStatus: string
{
    case Open = 'open';
    case Resolved = 'resolved';
    case Dismissed = 'dismissed';
}
