<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ErrorResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Throwable;

/**
 * Deploy chores for hosts without SSH, behind `X-Ops-Token`. Their failures are
 * spelled out — only whoever holds the token can see them.
 */
class OpsController extends Controller
{
    public function migrate(): JsonResponse
    {
        return $this->run(['migrate' => ['--force' => true]]);
    }

    /** Clears and rebuilds the config, route, event and view caches. */
    public function optimize(): JsonResponse
    {
        return $this->run(['optimize:clear' => [], 'optimize' => []]);
    }

    /**
     * @param  array<string, array<string, mixed>>  $commands
     */
    private function run(array $commands): JsonResponse
    {
        $output = [];
        foreach ($commands as $command => $parameters) {
            try {
                $exitCode = Artisan::call($command, $parameters);
            } catch (Throwable $e) {
                report($e);

                return ErrorResponse::make(ErrorCode::ServerError, "{$command} başarısız: {$e->getMessage()}");
            }

            $output[] = trim(Artisan::output());
            if ($exitCode !== 0) {
                return ErrorResponse::make(ErrorCode::ServerError, "{$command} başarısız (çıkış kodu {$exitCode}): ".implode("\n", $output));
            }
        }

        return response()->json(['status' => 'ok', 'output' => implode("\n", $output)]);
    }
}
