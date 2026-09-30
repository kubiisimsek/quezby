<?php

namespace App\Http\Requests\Admin;

/** Setting a player's rating (qb) by hand takes the new rating and a reason. */
class SetRatingRequest extends ReasonRequest
{
    /** The highest rating an owner can set: four digits, well above MasterClass. */
    public const MAX_RATING = 9999;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'rating' => ['required', 'integer', 'min:0', 'max:'.self::MAX_RATING],
        ];
    }

    public function rating(): int
    {
        return (int) $this->validated('rating');
    }
}
