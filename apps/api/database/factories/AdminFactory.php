<?php

namespace Database\Factories;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Admin>
 */
class AdminFactory extends Factory
{
    protected static ?string $password;

    /**
     * A viewer who has already chosen their own password, `password`.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => AdminRole::Viewer,
            'must_change_password' => false,
        ];
    }

    public function owner(): static
    {
        return $this->state(fn () => ['role' => AdminRole::Owner]);
    }

    public function moderator(): static
    {
        return $this->state(fn () => ['role' => AdminRole::Moderator]);
    }

    public function viewer(): static
    {
        return $this->state(fn () => ['role' => AdminRole::Viewer]);
    }

    public function role(AdminRole $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    /** Still on the temporary password they were given. */
    public function mustChangePassword(): static
    {
        return $this->state(fn () => ['must_change_password' => true]);
    }

    public function disabled(): static
    {
        return $this->state(fn () => ['disabled_at' => now()]);
    }
}
