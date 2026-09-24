<?php

/*
| Local Istanbul times, with the daily, ISO-week and monthly keys they belong to.
*/

dataset('istanbul moments', [
    'late evening' => ['2026-09-24 23:30', '2026-09-24', '2026-W39', '2026-09'],
    'after midnight' => ['2026-09-25 00:30', '2026-09-25', '2026-W39', '2026-09'],
    'last minute of Sunday' => ['2026-09-27 23:59', '2026-09-27', '2026-W39', '2026-09'],
    'Monday opens a week' => ['2026-09-28 00:00', '2026-09-28', '2026-W40', '2026-09'],
    'last minute of a month' => ['2026-09-30 23:59', '2026-09-30', '2026-W40', '2026-09'],
    'a month turns over' => ['2026-10-01 00:00', '2026-10-01', '2026-W40', '2026-10'],
    'new year in ISO week 53' => ['2027-01-01 00:30', '2027-01-01', '2026-W53', '2027-01'],
    'first ISO week' => ['2027-01-04 09:00', '2027-01-04', '2027-W01', '2027-01'],
]);
