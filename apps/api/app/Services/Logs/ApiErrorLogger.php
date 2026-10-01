<?php

namespace App\Services\Logs;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * API errors on the Loglar page, source `api`: every answer of 400 or more
 * but a 401 (a token ran out) and a 404/405 (nothing there) — with the
 * contract's error code and message, and a validation error's fields (never
 * what was sent) — and every exception Laravel reports, with where it was
 * thrown. A 500 that comes from an exception is one row, the exception's.
 */
final class ApiErrorLogger
{
    /** Answers too common, and too harmless, to keep. */
    public const QUIET = [401, 404, 405];

    private bool $exceptionLogged = false;

    public function __construct(private readonly SystemLogger $logger) {}

    public function handled(RequestHandled $event): void
    {
        $status = $event->response->getStatusCode();
        $logged = $this->exceptionLogged;
        $this->exceptionLogged = false;
        if ($status < 400 || in_array($status, self::QUIET, true) || $event->request->isMethod('OPTIONS') || ($status >= 500 && $logged)) {
            return;
        }

        $error = $event->response instanceof JsonResponse ? $event->response->getData(true)['error'] ?? null : null;
        $error = is_array($error) ? $error : [];
        $code = is_string($error['code'] ?? null) ? $error['code'] : "http_{$status}";
        $message = is_string($error['message'] ?? null) ? $error['message'] : (Response::$statusTexts[$status] ?? 'Error');

        $this->logger->write($this->level($status), LogSource::Api, $code, $message, [
            ...$this->where($event->request),
            'status' => $status,
            'durationMs' => $this->duration($event->request),
            'context' => array_filter([
                'route' => $event->request->route()?->uri(),
                'fields' => is_array($error['fields'] ?? null) ? $error['fields'] : null,
            ]),
        ]);
    }

    /** A reported exception — from a request, a deferred push or a command. */
    public function exception(Throwable $e): void
    {
        $request = $this->request();
        $this->logger->write(LogLevel::Error, LogSource::Api, 'exception', class_basename($e).': '.$e->getMessage(), [
            ...($request === null ? [] : $this->where($request)),
            'status' => $request === null ? null : 500,
            'context' => array_filter([
                'exception' => $e::class,
                'at' => $this->relative($e->getFile()).':'.$e->getLine(),
                'route' => $request?->route()?->uri(),
                'trace' => $this->trace($e),
            ]),
        ]);
        $this->exceptionLogged = $request !== null;
    }

    private function level(int $status): LogLevel
    {
        return match (true) {
            $status >= 500 => LogLevel::Error,
            $status === 429 => LogLevel::Info,
            default => LogLevel::Warning,
        };
    }

    /**
     * @return array{method: string, path: string, userId: string|null, platform: string|null, appVersion: string|null}
     */
    private function where(Request $request): array
    {
        return ['method' => $request->method(), 'path' => '/'.ltrim($request->path(), '/'), ...SystemLogger::device($request)];
    }

    /** The request being answered; none in a command. */
    private function request(): ?Request
    {
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return null;
        }
        $request = app('request');

        return $request instanceof Request ? $request : null;
    }

    private function duration(Request $request): ?int
    {
        $start = $request->server('REQUEST_TIME_FLOAT');

        return is_numeric($start) ? (int) max(0, round((microtime(true) - (float) $start) * 1000)) : null;
    }

    /** @return list<string> The first frames, in the API's own files where it can. */
    private function trace(Throwable $e): array
    {
        $frames = [];
        foreach ($e->getTrace() as $frame) {
            if (! isset($frame['file']) || str_contains($frame['file'], DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR)) {
                continue;
            }
            $frames[] = $this->relative($frame['file']).':'.($frame['line'] ?? 0).' '.($frame['class'] ?? '').($frame['type'] ?? '').$frame['function'];
            if (count($frames) === 8) {
                break;
            }
        }

        return $frames;
    }

    private function relative(string $file): string
    {
        return str_starts_with($file, base_path()) ? ltrim(substr($file, strlen(base_path())), DIRECTORY_SEPARATOR) : $file;
    }
}
