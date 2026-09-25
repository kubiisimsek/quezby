<?php

namespace App\Exceptions;

use App\Enums\ErrorCode;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Renders every error as `{ "error": { code, message, fields? } }`, whatever
 * threw it — see `docs/backend/api-contract.md`.
 */
final class ErrorResponse
{
    /**
     * @param  array<string, list<string>>  $fields
     * @param  array<string, string>  $headers
     */
    public static function make(
        ErrorCode $code,
        ?string $message = null,
        array $fields = [],
        ?int $status = null,
        array $headers = [],
        ?Throwable $debug = null,
    ): JsonResponse {
        $error = ['code' => $code->value, 'message' => $message ?? $code->message()];
        if ($fields !== []) {
            $error['fields'] = $fields;
        }
        if ($debug !== null && config('app.debug')) {
            $error['debug'] = [
                'exception' => $debug::class,
                'message' => $debug->getMessage(),
                'file' => $debug->getFile(),
                'line' => $debug->getLine(),
            ];
        }

        return new JsonResponse(['error' => $error], $status ?? $code->status(), $headers);
    }

    /** Null leaves the exception to Laravel — only for a response thrown on purpose. */
    public static function fromThrowable(Throwable $e): ?JsonResponse
    {
        return match (true) {
            $e instanceof HttpResponseException => null,
            $e instanceof ValidationException => self::make(
                ErrorCode::ValidationFailed,
                collect($e->errors())->flatten()->first() ?? ErrorCode::ValidationFailed->message(),
                $e->errors(),
            ),
            $e instanceof AuthenticationException => self::make(ErrorCode::Unauthenticated),
            $e instanceof HttpExceptionInterface => self::fromHttpException($e),
            default => self::make(ErrorCode::ServerError, debug: $e),
        };
    }

    private static function fromHttpException(HttpExceptionInterface $e): JsonResponse
    {
        $status = $e->getStatusCode();
        $code = match (true) {
            $status === 401 => ErrorCode::Unauthenticated,
            $status === 403 => ErrorCode::Forbidden,
            $status === 404, $status === 405 => ErrorCode::NotFound,
            $status === 429 => ErrorCode::TooManyRequests,
            $status >= 500 => ErrorCode::ServerError,
            default => ErrorCode::ValidationFailed,
        };
        $message = $status === 503 ? 'Bakım çalışması var, birazdan tekrar dene.' : null;

        return self::make($code, $message, status: $status, headers: $e->getHeaders());
    }
}
