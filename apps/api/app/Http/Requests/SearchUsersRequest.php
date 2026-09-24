<?php

namespace App\Http\Requests;

use App\Support\Username;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /users?search=…` — the start of a username, 2 to 20 of its characters. */
class SearchUsersRequest extends FormRequest
{
    private const MESSAGE = 'Aramak için 2 ile 20 arası harf, rakam, nokta ya da yıldız yaz.';

    protected function prepareForValidation(): void
    {
        $search = $this->query('search');
        if (is_string($search)) {
            $this->merge(['search' => Username::normalize($search)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['required', 'string', 'regex:/^[a-z0-9.*]{2,20}\z/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'search.required' => self::MESSAGE,
            'search.string' => self::MESSAGE,
            'search.regex' => self::MESSAGE,
        ];
    }

    /** Lower case; letters, digits, `.` and `*` only, so nothing in it is a `LIKE` wildcard. */
    public function prefix(): string
    {
        return (string) $this->validated('search');
    }
}
