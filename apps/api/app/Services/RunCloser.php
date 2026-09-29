<?php

namespace App\Services;

use App\Enums\RunStatus;
use App\Models\Run;
use App\Services\Rating\RatingService;
use Carbon\CarbonInterface;

/**
 * The one way a run ends without a finish: left for a new one (`abandoned`)
 * or past its time (`expired`). Either way it is charged to the player's
 * rating as a forfeit — a run that could be left for free would be the
 * cheapest way out of a bad one.
 */
final class RunCloser
{
    public function __construct(private readonly RatingService $ratings) {}

    /**
     * False when the run was closed already — by its finish, or by another
     * close. `$spared`: given up before it began, it costs nothing.
     */
    public function closeUnfinished(Run $run, RunStatus $status, CarbonInterface $now, bool $spared = false): bool
    {
        $attributes = ['status' => $status->value, 'open_user_id' => null]
            + ($status === RunStatus::Abandoned ? ['finished_at' => $now] : []);

        $closed = Run::query()->whereKey($run->id)->where('status', RunStatus::Started->value)->update($attributes);
        if ($closed === 0) {
            return false;
        }
        $run->forceFill([...$attributes, 'status' => $status])->syncOriginal();
        $this->ratings->forfeit($run, $spared);

        return true;
    }
}
