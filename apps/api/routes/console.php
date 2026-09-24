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
