<?php

namespace App\Http\Requests;

use App\Exceptions\ApiException;
use App\Support\Username;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUsernameRequest extends FormRequest
{
    private string $normalized;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'username' => ['nullable', 'string'],
        ];
    }

    /**
     * A name the username rules refuse is `username_invalid`, with the problem
     * code as the field's only entry — not a generic `validation_failed`.
     */
    protected function passedValidation(): void
    {
        $result = Username::validate((string) $this->validated('username'));
        if ($result->problem !== null) {
            throw ApiException::usernameInvalid($result->problem);
        }

        $this->normalized = (string) $result->normalized;
    }

    /** Trimmed and lower-cased; valid by the username rules. */
    public function normalizedUsername(): string
    {
        return $this->normalized;
    }
}
