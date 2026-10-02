<?php

namespace App\Services\Admin;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * The `devices` of `AdminAnalytics`: every player's phones seen since a
 * moment, from the device registry, consent or not — a table per system (its
 * rows the major versions), a table per big maker (its models) and one for the
 * other makers. Every row names the app versions on its phones, so an old
 * build shows where it lives. Shares are per-mille: a table's of every phone,
 * a row's of its table's. One grouped read; the tables are made here.
 *
 * @phpstan-type Versions array<string, array{version: string|null, devices: int}>
 * @phpstan-type Tally array{name: array<string, string|null>, devices: int, versions: Versions, rows: array<string, array{value: string|null, devices: int, versions: Versions}>}
 */
final class DeviceBreakdown
{
    /** The makers with a table of their own; the others share one, a row each. */
    private const BRANDS = 3;

    /** Rows a table lists; the phones of the others are its `rest`. */
    private const ROWS = 10;

    /** App versions a row names; the phones on the others are its `otherVersions`. */
    private const VERSIONS = 3;

    /**
     * @return array<string, mixed>
     */
    public function since(string $since): array
    {
        $groups = DB::table('player_devices')
            ->where('last_seen_at', '>=', $since)
            ->selectRaw('platform, brand, model, os_version, app_version, count(*) as devices')
            ->groupBy('platform', 'brand', 'model', 'os_version', 'app_version')
            ->orderBy('brand')
            ->get();

        $total = 0;
        $platforms = [];
        $brands = [];
        foreach ($groups as $group) {
            $devices = (int) $group->devices;
            $version = $group->app_version === null ? null : (string) $group->app_version;
            $total += $devices;

            if ($group->platform !== null) {
                $major = $group->os_version === null ? null : explode('.', (string) $group->os_version)[0];
                $platforms[$group->platform] ??= self::tally(['platform' => (string) $group->platform]);
                self::add($platforms[$group->platform], $major, $version, $devices);
            }

            // An iPhone is Apple's even when its app is too old to say so.
            $brand = $group->brand !== null ? (string) $group->brand : ($group->platform === 'ios' ? 'Apple' : null);
            $key = $brand === null ? '' : 'b:'.strtolower($brand);
            $brands[$key] ??= self::tally(['brand' => $brand]);
            self::add($brands[$key], $group->model === null ? null : (string) $group->model, $version, $devices);
        }

        $platforms = self::ranked(array_values($platforms), fn (array $tally) => $tally['name']['platform']);
        $brands = self::ranked(array_values($brands), fn (array $tally) => $tally['name']['brand']);
        $others = self::tally([]);
        foreach (array_slice($brands, self::BRANDS) as $brand) {
            foreach ($brand['versions'] as $version) {
                self::add($others, $brand['name']['brand'], $version['version'], $version['devices']);
            }
        }

        return [
            'total' => $total,
            'platforms' => array_map(fn (array $tally) => $tally['name'] + self::table($tally, $total), $platforms),
            'brands' => array_map(fn (array $tally) => $tally['name'] + self::table($tally, $total), array_slice($brands, 0, self::BRANDS)),
            'otherBrands' => self::table($others, $total),
        ];
    }

    /**
     * A table being counted: what it is, its phones, the app versions on them, and its rows.
     *
     * @param  array<string, string|null>  $name
     * @return Tally
     */
    private static function tally(array $name): array
    {
        return ['name' => $name, 'devices' => 0, 'versions' => [], 'rows' => []];
    }

    /**
     * Phones of a row on an app version, into their table.
     *
     * @param  Tally  $tally
     */
    private static function add(array &$tally, ?string $value, ?string $version, int $devices): void
    {
        // Keys carry a prefix: PHP would turn a key like `18` into a number.
        $row = $value === null ? '' : 'v:'.$value;
        $at = $version === null ? '' : 'v:'.$version;

        $tally['devices'] += $devices;
        $tally['versions'][$at] ??= ['version' => $version, 'devices' => 0];
        $tally['versions'][$at]['devices'] += $devices;
        $tally['rows'][$row] ??= ['value' => $value, 'devices' => 0, 'versions' => []];
        $tally['rows'][$row]['devices'] += $devices;
        $tally['rows'][$row]['versions'][$at] ??= ['version' => $version, 'devices' => 0];
        $tally['rows'][$row]['versions'][$at]['devices'] += $devices;
    }

    /**
     * A counted table as `AdminDeviceTable`: its biggest rows, each with its versions.
     *
     * @param  Tally  $tally
     * @return array{devices: int, share: int, rows: list<array<string, mixed>>, rest: int}
     */
    private static function table(array $tally, int $total): array
    {
        $rows = self::ranked(array_values($tally['rows']), fn (array $row) => $row['value']);
        $listed = array_slice($rows, 0, self::ROWS);

        return [
            'devices' => $tally['devices'],
            'share' => self::perMille($tally['devices'], $total),
            'rows' => array_map(function (array $row) use ($tally) {
                $versions = array_slice(self::ranked(array_values($row['versions']), fn (array $version) => $version['version'], newestFirst: true), 0, self::VERSIONS);

                return [
                    'value' => $row['value'],
                    'devices' => $row['devices'],
                    'share' => self::perMille($row['devices'], $tally['devices']),
                    'versions' => $versions,
                    'otherVersions' => $row['devices'] - array_sum(array_column($versions, 'devices')),
                ];
            }, $listed),
            'rest' => $tally['devices'] - array_sum(array_column($listed, 'devices')),
        ];
    }

    /**
     * Most phones first; then by name — naturally, `9` before `10` — the
     * nameless last. App versions tie newest first.
     *
     * @template T of array{devices: int}
     *
     * @param  list<T>  $items
     * @param  Closure(T): ?string  $name
     * @return list<T>
     */
    private static function ranked(array $items, Closure $name, bool $newestFirst = false): array
    {
        usort($items, function (array $a, array $b) use ($name, $newestFirst) {
            [$first, $second] = [$name($a), $name($b)];
            $order = $first === null || $second === null
                ? ($first === null) <=> ($second === null)
                : strnatcasecmp($first, $second) * ($newestFirst ? -1 : 1);

            return [$b['devices'], $order] <=> [$a['devices'], 0];
        });

        return $items;
    }

    private static function perMille(int $count, int $of): int
    {
        return $of > 0 ? (int) round($count * 1000 / $of) : 0;
    }
}
