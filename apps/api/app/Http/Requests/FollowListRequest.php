<?php

namespace App\Http\Requests;

use App\Services\FollowService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /me/following` and `/me/followers`: the first page, or the one after `cursor`. */
class FollowListRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cursor' => ['bail', 'nullable', 'string', 'max:200', function (string $attribute, string $value, Closure $fail) {
                if (FollowService::parseCursor($value) === null) {
                    $fail('Listenin devamı yüklenemedi, listeyi baştan yükle.');
                }
            }],
        ];
    }

    /**
     * @return array{0: string, 1: string}|null
     */
    public function cursor(): ?array
    {
        $cursor = $this->validated('cursor');

        return is_string($cursor) ? FollowService::parseCursor($cursor) : null;
    }
}
