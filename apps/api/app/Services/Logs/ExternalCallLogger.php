<?php

namespace App\Services\Logs;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Models\User;
use Illuminate\Http\Client\Events\ConnectionFailed;
use Illuminate\Http\Client\Events\ResponseReceived;
use Illuminate\Http\Client\Request as OutgoingRequest;
use Illuminate\Http\Client\Response as IncomingResponse;
use Illuminate\Http\Request;

/**
 * Every call the API makes to Firebase, Google or Apple that fails — an
 * answer of 400 or more, or no answer at all — becomes a row of source
 * `external`, named after the service, with what the service said. What was
 * sent is never kept (it carries tokens and keys). A call can say whom it was
 * about with `withAttributes(['log' => ['userId' => …, 'platform' => …, …]])`;
 * otherwise the row names the player who made the request.
 */
final class ExternalCallLogger
{
    /** The services the API talks to, by host — the row's event. */
    public const SERVICES = [
        'fcm.googleapis.com' => 'firebase',
        'oauth2.googleapis.com' => 'google_oauth',
        'www.googleapis.com' => 'google_keys',
        'playintegrity.googleapis.com' => 'play_integrity',
        'appleid.apple.com' => 'apple',
    ];

    public function __construct(private readonly SystemLogger $logger) {}

    public function received(ResponseReceived $event): void
    {
        $status = $event->response->status();
        if ($status < 400) {
            return;
        }

        $body = $this->body($event->response);
        $this->write($event->request, $status, $this->summary($status, $body), ['response' => $body], $this->duration($event->response));
    }

    public function failed(ConnectionFailed $event): void
    {
        $this->write($event->request, null, 'Bağlantı kurulamadı: '.$event->exception->getMessage(), []);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function write(OutgoingRequest $request, ?int $status, string $message, array $context, ?int $durationMs = null): void
    {
        $url = parse_url($request->url());
        $host = strtolower((string) ($url['host'] ?? ''));
        $about = $request->attributes()['log'] ?? [];
        $about = is_array($about) ? $about : [];

        $this->logger->write(LogLevel::Error, LogSource::External, self::SERVICES[$host] ?? ($host !== '' ? $host : 'unknown'), $message, [
            'status' => $status,
            'method' => $request->method(),
            'path' => $host.($url['path'] ?? ''),
            'durationMs' => $durationMs,
            'userId' => is_string($about['userId'] ?? null) ? $about['userId'] : $this->player(),
            'platform' => is_string($about['platform'] ?? null) ? $about['platform'] : null,
            'context' => array_filter([
                ...$context,
                ...array_diff_key($about, ['userId' => true, 'platform' => true]),
            ], fn ($value) => $value !== null && $value !== []),
        ]);
    }

    /** What the service answered: its JSON, or the start of its text. */
    private function body(IncomingResponse $response): mixed
    {
        $json = $response->json();
        if (is_array($json)) {
            return $json;
        }
        $text = trim(strip_tags($response->body()));

        return $text === '' ? null : SystemLogger::cut($text, 500);
    }

    /** `403 PERMISSION_DENIED: …` — Google's shape, OAuth's, or the text itself. */
    private function summary(int $status, mixed $body): string
    {
        if (is_array($body)) {
            $error = $body['error'] ?? null;
            if (is_array($error)) {
                $name = is_string($error['status'] ?? null) ? $error['status'] : null;
                $text = is_string($error['message'] ?? null) ? $error['message'] : null;

                return trim("{$status} ".implode(': ', array_filter([$name, $text])));
            }
            if (is_string($error)) {
                $text = is_string($body['error_description'] ?? null) ? $body['error_description'] : null;

                return trim("{$status} ".implode(': ', array_filter([$error, $text])));
            }
        }

        return is_string($body) ? "{$status}: {$body}" : (string) $status;
    }

    private function duration(IncomingResponse $response): ?int
    {
        $seconds = $response->transferStats?->getTransferTime();

        return $seconds === null ? null : (int) round($seconds * 1000);
    }

    private function player(): ?string
    {
        $request = app('request');
        $user = $request instanceof Request ? $request->user() : null;

        return $user instanceof User ? $user->id : null;
    }
}
