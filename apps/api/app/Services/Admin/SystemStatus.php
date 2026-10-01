<?php

namespace App\Services\Admin;

use App\Content\Catalog;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\Run;
use App\Services\Push\PushService;
use App\Support\AppKey;
use App\Support\ModerationToken;
use App\Support\OpsToken;
use App\Support\Release;
use App\Support\Timestamp;
use Illuminate\Database\Migrations\Migrator;
use Illuminate\Support\Facades\DB;

/**
 * `AdminSystem` in `packages/types`: what the API is running with — never a
 * secret itself, only whether one is set — and what waits to be done.
 */
final class SystemStatus
{
    public function __construct(
        private readonly Migrator $migrator,
        private readonly PushService $push,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function read(): array
    {
        $ttl = (int) config('quezby.runs.ttl_minutes');

        return [
            'environment' => (string) app()->environment(),
            'version' => Release::version(),
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'database' => DB::connection()->getDriverName(),
            'timezone' => (string) config('quezby.leaderboard.timezone'),
            'serverTime' => Timestamp::iso(now()),
            'season' => (int) config('quezby.season'),
            'engineVersion' => Rules::ENGINE_VERSION,
            'contentVersion' => Catalog::LATEST,
            'integrityMode' => (string) config('quezby.integrity.mode'),
            'dailyEpoch' => (string) config('quezby.daily.epoch'),
            'apps' => [
                'ios' => ['min' => (string) config('quezby.apps.ios.min_version'), 'latest' => (string) config('quezby.apps.ios.latest_version')],
                'android' => ['min' => (string) config('quezby.apps.android.min_version'), 'latest' => (string) config('quezby.apps.android.latest_version')],
            ],
            'tokens' => ['ops' => OpsToken::current() !== '', 'moderation' => ModerationToken::current() !== ''],
            'appKey' => AppKey::problem() === null,
            // Profile photos are re-encoded with GD; pushes need Firebase's project and key.
            'gd' => extension_loaded('gd') && function_exists('imagecreatefromstring'),
            'push' => $this->push->isConfigured(),
            'cached' => ['config' => app()->configurationIsCached(), 'routes' => app()->routesAreCached()],
            'pendingMigrations' => $this->pendingMigrations(),
            'runs' => [
                'open' => Run::query()->where('status', RunStatus::Started)->count(),
                'stale' => Run::query()->where('status', RunStatus::Started)->where('started_at', '<', now()->subMinutes($ttl))->count(),
            ],
            'limits' => [
                'reviewTopAll' => (int) config('quezby.plausibility.review_top_all'),
                'reviewTopWeekly' => (int) config('quezby.plausibility.review_top_weekly'),
                'leagueUnlockRuns' => (int) config('quezby.rating.unlock_runs'),
                'runTtlMinutes' => $ttl,
                'adminTokenHours' => (int) config('quezby.admin.token_hours'),
            ],
        ];
    }

    /**
     * The migrations uploaded but not run yet, by name.
     *
     * @return list<string>
     */
    public function pendingMigrations(): array
    {
        $files = $this->migrator->getMigrationFiles([database_path('migrations'), ...$this->migrator->paths()]);
        $ran = $this->migrator->repositoryExists() ? $this->migrator->getRepository()->getRan() : [];

        return array_values(array_diff(array_keys($files), $ran));
    }
}
