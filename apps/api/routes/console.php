<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Optional: only runs where the host has a cron calling `schedule:run`. Players'
// own stale runs close on their next start anyway.
Schedule::command('quezby:runs:expire')->hourly();

// Optional too: the API prunes analytics a chunk an hour by itself.
Schedule::command('quezby:analytics:prune')->dailyAt('04:30');

// Optional: pushes from the panel go out by themselves; without cron the open
// Push bildirimi page sends them.
Schedule::command('quezby:push:campaigns')->everyMinute()->withoutOverlapping();
