<?php

namespace App\Enums;

/** `AdminLogLevel` in `packages/types`: how bad a log row is. */
enum LogLevel: string
{
    case Error = 'error';
    case Warning = 'warning';
    case Info = 'info';
}
