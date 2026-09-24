<?php

namespace App\Game;

use Illuminate\Container\Attributes\Config;
use RuntimeException;

/**
 * Checkpoints: how the API tells a real-time run from a slowed-down one — the
 * twin of `packages/config/src/checkpoints.ts`. A few times in a ranked run
 * the app sends how many reels it has played and the SHA-256 of exactly those
 * moves (`prefixHash`); the API signs them, with the time it saw them, into a
 * receipt. It keeps nothing: the receipt is the record. The finish hands the
 * receipts back, and `RunVerifier` holds each against the log it replays and
 * the time those moves need on the app's pace.
 *
 * A receipt is `base64url(json {r, n, h, t}) . base64url(HMAC-SHA256)`, keyed
 * by a key derived from `APP_KEY`: anyone can read one, only the API can make
 * or change one.
 */
final class Checkpoint
{
    public function __construct(
        #[Config('app.key')]
        private readonly ?string $appKey,
    ) {}

    /**
     * The first `$count` moves as one line — `gesture,t,d;gesture,t,d;…` — the
     * text both sides hash. Only whole numbers reach it: the engine refuses
     * any other log before its checkpoints are looked at.
     *
     * @param  array<mixed>  $actions
     */
    public static function prefixText(array $actions, int $count): string
    {
        $moves = [];
        foreach (array_slice(array_values($actions), 0, max(0, $count)) as $action) {
            $numbers = is_array($action) ? array_values($action) : [];
            $moves[] = implode(',', array_map(
                fn (int $i) => is_int($numbers[$i] ?? null) ? $numbers[$i] : 0,
                [0, 1, 2],
            ));
        }

        return implode(';', $moves);
    }

    /**
     * What a checkpoint commits to: the SHA-256 of `prefixText`, lower-case hex.
     *
     * @param  array<mixed>  $actions
     */
    public static function prefixHash(array $actions, int $count): string
    {
        return hash('sha256', self::prefixText($actions, $count));
    }

    /** A receipt for `$reel` moves of the run hashing to `$prefixHash`, seen at `$timeMs` (Unix ms). */
    public function sign(string $runId, int $reel, string $prefixHash, int $timeMs): string
    {
        $payload = self::encode(json_encode(['r' => $runId, 'n' => $reel, 'h' => $prefixHash, 't' => $timeMs], JSON_THROW_ON_ERROR));

        return $payload.'.'.self::encode(hash_hmac('sha256', $payload, $this->key(), true));
    }

    /** What a receipt says — or null when the API did not sign it, or it was changed since. */
    public function open(string $receipt): ?CheckpointReceipt
    {
        $parts = explode('.', $receipt);
        if (count($parts) !== 2 || ! hash_equals(self::encode(hash_hmac('sha256', $parts[0], $this->key(), true)), $parts[1])) {
            return null;
        }

        $json = base64_decode(strtr($parts[0], '-_', '+/'), true);
        $data = $json === false ? null : json_decode($json, true);
        if (
            ! is_array($data)
            || ! is_string($data['r'] ?? null)
            || ! is_int($data['n'] ?? null)
            || ! is_string($data['h'] ?? null)
            || ! is_int($data['t'] ?? null)
        ) {
            return null;
        }

        return new CheckpointReceipt($data['r'], $data['n'], $data['h'], $data['t']);
    }

    /** The HMAC key, derived from the app key so that no other secret has to be kept. */
    private function key(): string
    {
        if ((string) $this->appKey === '') {
            throw new RuntimeException('APP_KEY is not set: checkpoint receipts can be neither signed nor checked.');
        }

        return hash_hmac('sha256', 'quezby-checkpoint', (string) $this->appKey, true);
    }

    private static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
