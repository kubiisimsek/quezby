<?php

namespace App\Enums;

/** What a player reported about another — `ReportReason` in `packages/types`. */
enum ReportReason: string
{
    case Photo = 'photo';
    case Name = 'name';
}
