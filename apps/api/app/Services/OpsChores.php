<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use RuntimeException;
use Throwable;

/**
 * The deploy chores a host without SSH cannot run by hand — migrations, the
 * caches, stale runs, old analytics — for `POST /ops/*` and the admin panel's system page.
 * A failure says which command failed and what it printed: only whoever holds
 * the ops token or the owner role ever sees it.
 */
final class OpsChores
{
    /** @throws RuntimeException */
    public function migrate(): string
    {
        return $this->run(['migrate' => ['--force' => true]]);
    }

    /**
     * Clears and rebuilds the config, route, event and view caches.
     *
     * @throws RuntimeException
     */
    public function optimize(): string
    {
        return $this->run(['optimize:clear' => [], 'optimize' => []]);
    }

    /**
     * Closes the runs left open past their time — `quezby:runs:expire`.
     *
     * @throws RuntimeException
     */
    public function expireRuns(): string
    {
        return $this->run(['quezby:runs:expire' => []]);
    }

    /**
     * Deletes the analytics rows and registry phones past their keep —
     * `quezby:analytics:prune`.
     *
     * @throws RuntimeException
     */
    public function pruneAnalytics(): string
    {
        return $this->run(['quezby:analytics:prune' => []]);
    }

    /**
     * @param  array<string, array<string, mixed>>  $commands
     *
     * @throws RuntimeException
     */
    private function run(array $commands): string
    {
        $output = [];
        foreach ($commands as $command => $parameters) {
            try {
                $exitCode = Artisan::call($command, $parameters);
            } catch (Throwable $e) {
                report($e);

                throw new RuntimeException("{$command} başarısız: {$e->getMessage()}", previous: $e);
            }

            $output[] = trim(Artisan::output());
            if ($exitCode !== 0) {
                throw new RuntimeException("{$command} başarısız (çıkış kodu {$exitCode}): ".implode("\n", $output));
            }
        }

        return implode("\n", $output);
    }
}
