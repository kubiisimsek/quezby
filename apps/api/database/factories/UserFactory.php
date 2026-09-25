<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * A guest with no name yet — an account from before automatic names.
     * `POST /auth/guest` now names one `guest` and eight digits; give it one
     * with `withUsername('guest00000007')`.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'platform' => fake()->randomElement(['ios', 'android']),
            'install_id' => (string) Str::uuid(),
        ];
    }

    public function withUsername(?string $username = null): static
    {
        return $this->state(fn () => [
            'username' => $username ?? 'player'.fake()->unique()->numberBetween(100, 999999),
        ]);
    }

    /** Email and password attached. */
    public function linked(?string $email = null, string $password = 'password'): static
    {
        return $this->state(fn () => [
            'email' => $email ?? fake()->unique()->safeEmail(),
            'password' => $password === 'password' ? (static::$password ??= Hash::make('password')) : $password,
        ]);
    }
}
