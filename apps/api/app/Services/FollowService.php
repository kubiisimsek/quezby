<?php

namespace App\Services;

use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Who follows whom. Following is idempotent and capped; the lists page newest
 * first behind an opaque cursor. A banned player is left out of every list and
 * count — and does not use up a place under the cap.
 */
final class FollowService
{
    public const PAGE_SIZE = 50;

    public function __construct(
        #[Config('quezby.follows.limit')]
        private readonly int $limit,
    ) {}

    /** Follows once, however often it is asked. */
    public function follow(User $follower, User $followee): void
    {
        if ($follower->is($followee)) {
            throw ApiException::of(ErrorCode::CannotFollowSelf);
        }
        // Whoever follows shows up in a followers list, which has no room for a nameless row.
        if ($follower->username === null) {
            throw ValidationException::withMessages([
                'username' => [__('messages.username_to_follow')],
            ]);
        }
        if ($this->follows($follower, $followee)) {
            return;
        }
        if ($this->visible('follower_id', 'followee_id', $follower)->count() >= $this->limit) {
            throw new ApiException(ErrorCode::FollowLimit, ErrorCode::FollowLimit->message(['limit' => Locale::current()->group($this->limit)]));
        }

        DB::table('follows')->insertOrIgnore([
            'follower_id' => $follower->id,
            'followee_id' => $followee->id,
            'created_at' => now(),
        ]);
    }

    public function unfollow(User $follower, User $followee): void
    {
        DB::table('follows')->where('follower_id', $follower->id)->where('followee_id', $followee->id)->delete();
    }

    public function follows(User $follower, User $followee): bool
    {
        return DB::table('follows')->where('follower_id', $follower->id)->where('followee_id', $followee->id)->exists();
    }

    /**
     * Both directions between two players, in one query.
     *
     * @return array{isFollowing: bool, followsMe: bool}
     */
    public function between(User $viewer, User $player): array
    {
        if ($viewer->is($player)) {
            return ['isFollowing' => false, 'followsMe' => false];
        }

        $followers = DB::table('follows')
            ->where(fn (Builder $query) => $query->where('follower_id', $viewer->id)->where('followee_id', $player->id))
            ->orWhere(fn (Builder $query) => $query->where('follower_id', $player->id)->where('followee_id', $viewer->id))
            ->pluck('follower_id');

        return ['isFollowing' => $followers->contains($viewer->id), 'followsMe' => $followers->contains($player->id)];
    }

    /**
     * @return array{followers: int, following: int}
     */
    public function counts(User $user): array
    {
        return [
            'followers' => $this->visible('followee_id', 'follower_id', $user)->count(),
            'following' => $this->visible('follower_id', 'followee_id', $user)->count(),
        ];
    }

    /**
     * A page of the players `$user` follows, newest follow first.
     *
     * @param  array{0: string, 1: string}|null  $after  A parsed cursor.
     * @return array{users: Collection<int, User>, nextCursor: string|null}
     */
    public function following(User $user, ?array $after): array
    {
        return $this->page('follower_id', 'followee_id', $user, $after);
    }

    /**
     * A page of the players who follow `$user`, newest follow first.
     *
     * @param  array{0: string, 1: string}|null  $after  A parsed cursor.
     * @return array{users: Collection<int, User>, nextCursor: string|null}
     */
    public function followers(User $user, ?array $after): array
    {
        return $this->page('followee_id', 'follower_id', $user, $after);
    }

    /**
     * The cursor after a row: when it was followed and who, so rows that
     * share a second still page in one fixed order.
     */
    public static function cursor(string $followedAt, string $userId): string
    {
        return rtrim(strtr(base64_encode($followedAt.'|'.$userId), '+/', '-_'), '=');
    }

    /**
     * @return array{0: string, 1: string}|null Null for anything `cursor()` did not write.
     */
    public static function parseCursor(string $cursor): ?array
    {
        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($decoded === false || preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)\|([0-9a-z]{26})\z/', $decoded, $parts) !== 1) {
            return null;
        }

        return [$parts[1], $parts[2]];
    }

    /**
     * @param  array{0: string, 1: string}|null  $after
     * @return array{users: Collection<int, User>, nextCursor: string|null}
     */
    private function page(string $own, string $other, User $user, ?array $after): array
    {
        $rows = User::query()
            ->join('follows', "follows.{$other}", '=', 'users.id')
            ->where("follows.{$own}", $user->id)
            ->whereNull('users.banned_at')
            ->when($after !== null, fn (EloquentBuilder $query) => $query->where(fn (EloquentBuilder $query) => $query
                ->where('follows.created_at', '<', $after[0])
                ->orWhere(fn (EloquentBuilder $query) => $query
                    ->where('follows.created_at', $after[0])
                    ->where('users.id', '<', $after[1]))))
            ->orderByDesc('follows.created_at')
            ->orderByDesc('users.id')
            ->limit(self::PAGE_SIZE + 1)
            ->get(['users.*', 'follows.created_at as followed_at']);

        $page = $rows->take(self::PAGE_SIZE)->values();
        $last = $page->last();

        return [
            'users' => $page,
            'nextCursor' => $rows->count() > self::PAGE_SIZE && $last !== null
                ? self::cursor((string) $last->getAttribute('followed_at'), $last->id)
                : null,
        ];
    }

    /** Follows rows where `$user` is on the `$own` side and whoever is on the other is not banned. */
    private function visible(string $own, string $other, User $user): Builder
    {
        return DB::table('follows')
            ->join('users', 'users.id', '=', "follows.{$other}")
            ->where("follows.{$own}", $user->id)
            ->whereNull('users.banned_at');
    }
}
