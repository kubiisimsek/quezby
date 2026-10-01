<?php

namespace App\Services\Push;

use App\Enums\LeagueTier;
use App\Enums\RunMode;
use App\Models\PushToken;
use App\Models\User;
use App\Services\DailyService;
use App\Support\Username;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Who a push from the panel goes to: `AdminPushFilters` in `packages/types`
 * as a query. Every filter narrows; a banned player is never picked; only a
 * player with a phone registered for pushes can get one.
 *
 * - `username` — one player.
 * - `tiers` — Dereceli leagues (`bronze` … `master`), `none` for players
 *   with no league yet.
 * - `daily` — `played` / `not_played` today's Günün akışı.
 * - `playedWithinDays` — started a run in the last N days;
 *   `notPlayedForDays` — none in the last N days (never counts too).
 * - `joinedWithinDays` — an account made in the last N days.
 * - `platform` — the phone (`ios`, `android`).
 * - `locales` — the account's language.
 * - `account` — `guest` (no email, no Apple or Google) or `registered`.
 */
final class PushAudience
{
    public const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'none'];

    public function __construct(private readonly DailyService $daily) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<User>
     */
    public function players(array $filters): Builder
    {
        $username = isset($filters['username']) ? Username::normalize(ltrim((string) $filters['username'], '@')) : '';
        $tiers = array_values(array_intersect(self::TIERS, (array) ($filters['tiers'] ?? [])));
        $since = fn (int $days) => now()->subDays($days);

        return User::query()
            ->whereNull('banned_at')
            ->when($username !== '', fn (Builder $query) => $query->where('username', $username))
            ->when($tiers !== [], function (Builder $query) use ($tiers) {
                $bySlug = collect(LeagueTier::cases())->mapWithKeys(fn (LeagueTier $tier) => [$tier->slug() => $tier->value]);
                $named = array_values(array_map(fn (string $slug) => $bySlug[$slug], array_diff($tiers, ['none'])));
                $query->where(function (Builder $query) use ($named, $tiers) {
                    if ($named !== []) {
                        $query->whereIn('id', fn (QueryBuilder $sub) => $sub->select('user_id')->from('player_ratings')->whereIn('tier', $named));
                    }
                    if (in_array('none', $tiers, true)) {
                        $query->orWhereNotIn('id', fn (QueryBuilder $sub) => $sub->select('user_id')->from('player_ratings')->whereNotNull('tier'));
                    }
                });
            })
            ->when($filters['daily'] ?? null, function (Builder $query, string $daily) {
                $today = fn (QueryBuilder $sub) => $sub->select('user_id')->from('runs')
                    ->where('mode', RunMode::Daily->value)->where('daily_key', $this->daily->dayKey(now()));
                $daily === 'played' ? $query->whereIn('id', $today) : $query->whereNotIn('id', $today);
            })
            ->when($filters['playedWithinDays'] ?? null, fn (Builder $query, int|string $days) => $query->whereIn('id', fn (QueryBuilder $sub) => $sub
                ->select('user_id')->from('runs')->where('started_at', '>=', $since((int) $days))))
            ->when($filters['notPlayedForDays'] ?? null, fn (Builder $query, int|string $days) => $query->whereNotIn('id', fn (QueryBuilder $sub) => $sub
                ->select('user_id')->from('runs')->where('started_at', '>=', $since((int) $days))))
            ->when($filters['joinedWithinDays'] ?? null, fn (Builder $query, int|string $days) => $query->where('created_at', '>=', $since((int) $days)))
            ->when($filters['locales'] ?? null, fn (Builder $query, array $locales) => $query->whereIn('locale', $locales))
            ->when(($filters['account'] ?? null) === 'guest', fn (Builder $query) => $query->whereNull('email')->whereDoesntHave('identities'))
            ->when(($filters['account'] ?? null) === 'registered', fn (Builder $query) => $query
                ->where(fn (Builder $query) => $query->whereNotNull('email')->orWhereHas('identities')));
    }

    /**
     * The phones of the players the filter picks, of the platform asked for.
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<PushToken>
     */
    public function devices(array $filters): Builder
    {
        return PushToken::query()
            ->whereIn('push_tokens.user_id', $this->players($filters)->select('id'))
            ->when($filters['platform'] ?? null, fn (Builder $query, string $platform) => $query->where('push_tokens.platform', $platform));
    }

    /**
     * `AdminPushAudience`: how many players the filter picks, how many of
     * them have a phone to push to, how many phones — and how many phones
     * of each language, to see which words are worth writing.
     *
     * @param  array<string, mixed>  $filters
     * @return array{players: int, reachable: int, devices: int, ios: int, android: int, locales: object}
     */
    public function count(array $filters): array
    {
        $byPlatform = $this->devices($filters)->toBase()->selectRaw('push_tokens.platform as platform, count(*) as total')->groupBy('push_tokens.platform')->pluck('total', 'platform');

        return [
            'players' => $this->players($filters)->count(),
            'reachable' => (int) $this->devices($filters)->toBase()->distinct()->count('push_tokens.user_id'),
            'devices' => (int) $byPlatform->sum(),
            'ios' => (int) ($byPlatform['ios'] ?? 0),
            'android' => (int) ($byPlatform['android'] ?? 0),
            'locales' => (object) $this->devices($filters)->toBase()
                ->join('users', 'users.id', '=', 'push_tokens.user_id')
                ->selectRaw('users.locale as locale, count(*) as total')
                ->groupBy('users.locale')
                ->pluck('total', 'locale')
                ->map(fn ($total) => (int) $total)
                ->all(),
        ];
    }
}
