<?php

namespace App\Services\Devices;

use App\Models\PlayerDevice;
use App\Models\User;
use App\Services\Admin\AdminRuns;
use App\Support\DeviceHeader;
use App\Support\Timestamp;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;

/**
 * The device registry: every phone a player used — its install, system,
 * maker, model and app build, first and last seen. Kept for every player,
 * consent or not, for support and security (`docs/product/analytics.md`);
 * written at most once a day per phone by `Analytics\Presence`, bounded to a
 * few phones a player and pruned once unseen for long.
 */
final class DeviceRegistry
{
    public function __construct(
        #[Config('quezby.devices.per_player')]
        private readonly int $perPlayer,
    ) {}

    /** The phone was seen: a row the first time, the newest labels after — two statements at most. */
    public function seen(User $user, DeviceHeader $device, ?string $appVersion, ?CarbonInterface $at = null): void
    {
        $now = ($at ?? now())->format('Y-m-d H:i:s');
        $labels = [
            'platform' => $device->platform?->value,
            'os_version' => $device->os,
            'brand' => $device->brand,
            'model' => $device->model,
            'app_version' => self::version($appVersion),
            'app_build' => $device->build,
        ];

        $inserted = DB::table('player_devices')->insertOrIgnore([
            'user_id' => $user->id,
            'install_id' => $device->installId,
            ...$labels,
            'first_seen_at' => $now,
            'last_seen_at' => $now,
        ]);
        if ($inserted > 0) {
            $this->keepLatest($user);

            return;
        }

        DB::table('player_devices')
            ->where('user_id', $user->id)
            ->where('install_id', $device->installId)
            ->update([...array_filter($labels, fn (?string $label) => $label !== null), 'last_seen_at' => $now]);
    }

    /**
     * `AdminPlayerDevice` in `packages/types`: the player's phones, most
     * recently seen first, each with the other accounts seen on it.
     *
     * @return list<array<string, mixed>>
     */
    public function of(User $user): array
    {
        $devices = $user->devices()->orderByDesc('last_seen_at')->orderByDesc('id')->get();
        $installs = $devices->pluck('install_id')->all();

        $others = $installs === [] ? collect() : PlayerDevice::query()
            ->with('user:id,username,banned_at')
            ->whereIn('install_id', $installs)
            ->where('user_id', '!=', $user->id)
            ->orderBy('first_seen_at')
            ->limit(50)
            ->get()
            ->groupBy('install_id');

        return $devices->map(fn (PlayerDevice $device) => [
            'installId' => $device->install_id,
            'platform' => $device->platform,
            'osVersion' => $device->os_version,
            'brand' => $device->brand,
            'model' => $device->model,
            'appVersion' => $device->app_version,
            'appBuild' => $device->app_build,
            'firstSeenAt' => Timestamp::iso($device->first_seen_at),
            'lastSeenAt' => Timestamp::iso($device->last_seen_at),
            'others' => ($others[$device->install_id] ?? collect())
                ->map(fn (PlayerDevice $other) => AdminRuns::ref($other->user))
                ->filter()
                ->take(5)
                ->values()
                ->all(),
        ])->values()->all();
    }

    /** A player's phones beyond the newest few go: a reinstall mints a new install id every time. */
    private function keepLatest(User $user): void
    {
        $stale = DB::table('player_devices')
            ->where('user_id', $user->id)
            ->orderByDesc('last_seen_at')
            ->orderByDesc('id')
            ->offset($this->perPlayer)
            ->limit(100)
            ->pluck('id');

        if ($stale->isNotEmpty()) {
            DB::table('player_devices')->whereIn('id', $stale->all())->delete();
        }
    }

    /** `X-App-Version` as a label: printable ASCII, at most 32 characters. */
    public static function version(?string $version): ?string
    {
        $clean = trim((string) preg_replace('/[^\x21-\x7E]/', '', (string) $version));

        return $clean === '' ? null : substr($clean, 0, 32);
    }
}
