<?php

namespace App\Enums;

/** `AdminAuditVia` in `packages/types`: where an audited action came from. */
enum AuditVia: string
{
    case Panel = 'panel';
    case Cli = 'cli';
    case Ops = 'ops';
    case System = 'system';
}
