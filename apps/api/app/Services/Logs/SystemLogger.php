<?php

namespace App\Services\Logs;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\Devices\DeviceRegistry;
use App\Support\DeviceHeader;
use Illuminate\Container\Attributes\Config;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Writes the rows of the panel's Loglar page. Never throws: a row that
 * cannot be written goes to laravel.log instead, and whatever asked for it
 * carries on. Secrets never reach a row — a key that names one (`token`,
 * `password`, `private_key`…) keeps only that it was there — and every value
 * is cut to a length.
 *
 * Every row is counted in `system_log_days` (kept for good) and written in
 * full to `system_logs` (kept `quezby.logs.keep_days` of its level) — unless
 * its level already wrote `per_minute` rows this minute: then it is only
 * counted. Now and then a write takes the rows past their days with it.
 */
final class SystemLogger
{
    /** Keys whose values never reach a row, at any depth. */
    public const SECRETS = [
        'token', 'access_token', 'refresh_token', 'id_token', 'identity_token', 'identitytoken',
        'integrity_token', 'authorization_code', 'authorizationcode', 'client_secret', 'private_key',
        'assertion', 'authorization', 'password', 'password_confirmation', 'current_password', 'cookie',
    ];

    public const REDACTED = '[gizli]';

    private const MAX_STRING = 1000;

    private const MAX_CONTEXT_BYTES = 8000;

    /** What the logs keep and allow when the config has no say — a config cached before `quezby.logs` existed. */
    public const DEFAULT_KEEP_DAYS = ['error' => 90, 'warning' => 14, 'info' => 3];

    public const DEFAULT_PER_MINUTE = ['error' => 600, 'warning' => 300, 'info' => 300];

    /** @var array<string, int> */
    private readonly array $keepDays;

    /** @var array<string, int> */
    private readonly array $perMinute;

    private readonly string $timezone;

    private readonly int $pruneOdds;

    private readonly int $pruneBatch;

    /**
     * Every setting may be missing: a host whose config was cached by an
     * older release must still answer every request (logging never breaks
     * one), so each falls back to its default.
     *
     * @param  array<string, int>|null  $keepDays  by level
     * @param  array<string, int>|null  $perMinute  by level
     */
    public function __construct(
        #[Config('quezby.logs.keep_days')]
        ?array $keepDays = null,
        #[Config('quezby.logs.per_minute')]
        ?array $perMinute = null,
        #[Config('quezby.leaderboard.timezone')]
        ?string $timezone = null,
        #[Config('quezby.logs.prune_odds')]
        ?int $pruneOdds = null,
        #[Config('quezby.logs.prune_batch')]
        ?int $pruneBatch = null,
    ) {
        $this->keepDays = $keepDays ?? self::DEFAULT_KEEP_DAYS;
        $this->perMinute = $perMinute ?? self::DEFAULT_PER_MINUTE;
        $this->timezone = $timezone ?? 'Europe/Istanbul';
        $this->pruneOdds = $pruneOdds ?? 100;
        $this->pruneBatch = $pruneBatch ?? 1000;
    }

    /** The longest any row is kept, in days. */
    public function longestKeep(): int
    {
        return max($this->keepDays);
    }

    /**
     * @param  array{status?: int|null, method?: string|null, path?: string|null, durationMs?: int|null, userId?: string|null, platform?: string|null, appVersion?: string|null, context?: array<string, mixed>|null}  $fields
     */
    public function write(LogLevel $level, LogSource $source, string $event, string $message, array $fields = []): void
    {
        $event = self::cut($event, 48);
        $this->count($level, $source, $event);

        try {
            if (! $this->withinBudget($level)) {
                return;
            }
            $context = $fields['context'] ?? null;

            SystemLog::query()->create([
                'level' => $level,
                'source' => $source,
                'event' => $event,
                'message' => self::cut(trim($message) === '' ? $event : $message, 500),
                'status' => isset($fields['status']) && $fields['status'] > 0 && $fields['status'] < 1000 ? $fields['status'] : null,
                'method' => isset($fields['method']) ? self::cut(strtoupper($fields['method']), 8) : null,
                'path' => isset($fields['path']) ? self::cut($fields['path'], 191) : null,
                'duration_ms' => isset($fields['durationMs']) ? max(0, $fields['durationMs']) : null,
                'user_id' => $fields['userId'] ?? null,
                'platform' => isset($fields['platform']) ? self::cut($fields['platform'], 8) : null,
                'app_version' => isset($fields['appVersion']) ? self::cut($fields['appVersion'], 32) : null,
                'context' => $context === null || $context === [] ? null : self::bounded(self::clean($context)),
                'created_at' => now(),
            ]);

            $this->maybePrune();
        } catch (Throwable $e) {
            Log::warning('A log row could not be written.', ['event' => $event, 'reason' => $e->getMessage()]);
        }
    }

    /** Rows past the days of their level, a batch of each at a time. Returns how many went. */
    public function prune(): int
    {
        $gone = 0;
        foreach (LogLevel::cases() as $level) {
            $gone += SystemLog::query()
                ->where('level', $level)
                ->where('created_at', '<', now()->subDays($this->keepDays[$level->value] ?? 14))
                ->orderBy('id')
                ->limit($this->pruneBatch)
                ->delete();
        }

        return $gone;
    }

    /** The day a row is counted on: the game's day (`quezby.leaderboard.timezone`). */
    public function today(): string
    {
        return now()->setTimezone($this->timezone)->format('Y-m-d');
    }

    /**
     * The player and the phone a request comes from — what an API row and a
     * phone's row carry.
     *
     * @return array{userId: string|null, platform: string|null, appVersion: string|null}
     */
    public static function device(Request $request): array
    {
        $user = $request->user();
        $header = DeviceHeader::from($request);

        return [
            'userId' => $user instanceof User ? $user->id : null,
            'platform' => $header?->platform?->value,
            'appVersion' => DeviceRegistry::version($request->header('X-App-Version')),
        ];
    }

    /**
     * Context without its secrets, every string cut to a length, at most four
     * levels deep.
     *
     * @param  array<array-key, mixed>  $value
     * @return array<array-key, mixed>
     */
    public static function clean(array $value, int $depth = 0): array
    {
        $clean = [];
        foreach ($value as $key => $item) {
            if (is_string($key) && in_array(strtolower($key), self::SECRETS, true)) {
                $clean[$key] = self::REDACTED;

                continue;
            }
            $clean[$key] = match (true) {
                is_array($item) => $depth >= 3 ? '…' : self::clean($item, $depth + 1),
                is_string($item) => self::cut($item, self::MAX_STRING),
                is_int($item), is_float($item), is_bool($item), $item === null => $item,
                default => self::cut(get_debug_type($item), 64),
            };
        }

        return $clean;
    }

    public static function cut(string $text, int $length): string
    {
        $text = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);

        return mb_strlen($text) > $length ? mb_substr($text, 0, $length - 1).'…' : $text;
    }

    /**
     * @param  array<array-key, mixed>  $context
     * @return array<array-key, mixed>
     */
    private static function bounded(array $context): array
    {
        $json = (string) json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);

        return strlen($json) <= self::MAX_CONTEXT_BYTES
            ? $context
            : ['truncated' => mb_strcut($json, 0, self::MAX_CONTEXT_BYTES)];
    }

    /** One more of this day, source, event and level — kept for good. */
    private function count(LogLevel $level, LogSource $source, string $event): void
    {
        try {
            DB::table('system_log_days')->upsert(
                [['day' => $this->today(), 'source' => $source->value, 'event' => $event, 'level' => $level->value, 'total' => 1]],
                ['day', 'source', 'event', 'level'],
                ['total' => DB::raw('total + 1')],
            );
        } catch (Throwable $e) {
            Log::warning('A log row could not be counted.', ['event' => $event, 'reason' => $e->getMessage()]);
        }
    }

    /** Each level its own budget: a flood of pushes never crowds out an error. */
    private function withinBudget(LogLevel $level): bool
    {
        $key = "system-logs:{$level->value}:".now()->format('YmdHi');
        Cache::add($key, 0, 120);

        return (int) Cache::increment($key) <= ($this->perMinute[$level->value] ?? 300);
    }

    private function maybePrune(): void
    {
        if ($this->pruneOdds > 0 && random_int(1, $this->pruneOdds) === 1) {
            $this->prune();
        }
    }
}
