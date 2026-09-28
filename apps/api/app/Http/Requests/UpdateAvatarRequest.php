<?php

namespace App\Http\Requests;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `UpdateAvatarRequest` in `packages/types`: the photo as base64 — at most
 * 100 KB once decoded, as the phone squeezes it. Anything that is not a photo
 * of that size is `photo_invalid`, not a validation error: the app says one
 * thing about it.
 */
class UpdateAvatarRequest extends FormRequest
{
    private string $bytes = '';

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'image' => ['required', 'string'],
        ];
    }

    protected function passedValidation(): void
    {
        $image = (string) $this->validated('image');
        $bytes = strlen($image) > 4 * intdiv((int) config('quezby.avatars.max_bytes') + 2, 3) + 4 ? false : base64_decode($image, true);
        if ($bytes === false || $bytes === '') {
            throw ApiException::of(ErrorCode::PhotoInvalid);
        }
        $this->bytes = $bytes;
    }

    public function bytes(): string
    {
        return $this->bytes;
    }
}
