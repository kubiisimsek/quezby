<?php

namespace App\Support;

use Dotenv\Dotenv;
use Throwable;

/**
 * The token that unlocks the ops routes — `OPS_TOKEN` as the `.env` file says
 * right now. While the configuration is cached Laravel does not read `.env`
 * at all, so a token cleared after `ops/optimize` would otherwise live on in
 * the cache, and a fresh deploy would stay locked out by an old cache.
 */
final class OpsToken
{
    public static function current(): string
    {
        return self::resolve(
            app()->configurationIsCached(),
            app()->environmentFilePath(),
            (string) config('quezby.ops_token'),
        );
    }

    public static function resolve(bool $configIsCached, string $environmentFile, string $configured, string $key = 'OPS_TOKEN'): string
    {
        if (! $configIsCached) {
            return $configured;
        }
        if (! is_file($environmentFile)) {
            return '';
        }

        try {
            $values = Dotenv::parse((string) file_get_contents($environmentFile));
        } catch (Throwable) {
            return '';
        }

        return (string) ($values[$key] ?? '');
    }
}
