<?php

namespace App\Exceptions;

use App\Enums\ErrorCode;
use App\Support\UsernameProblem;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/** An error the API answers on purpose, in the contract's one error shape. */
class ApiException extends RuntimeException
{
    /**
     * @param  array<string, list<string>>  $fields
     */
    public function __construct(
        public readonly ErrorCode $errorCode,
        ?string $message = null,
        public readonly array $fields = [],
    ) {
        parent::__construct($message ?? $errorCode->message());
    }

    public static function of(ErrorCode $code): self
    {
        return new self($code);
    }

    public static function usernameInvalid(UsernameProblem $problem): self
    {
        return new self(ErrorCode::UsernameInvalid, $problem->message(), ['username' => [$problem->value]]);
    }

    public function render(): JsonResponse
    {
        return ErrorResponse::make($this->errorCode, $this->getMessage(), $this->fields);
    }
}
