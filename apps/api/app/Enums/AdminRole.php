<?php

namespace App\Enums;

/**
 * `AdminRole` in `packages/types`. Each role can do everything the one below
 * it can: İzleyici reads, Moderatör also moderates, Sahip also deletes
 * players and runs the admins and the system.
 */
enum AdminRole: string
{
    case Owner = 'owner';
    case Moderator = 'moderator';
    case Viewer = 'viewer';

    public function rank(): int
    {
        return match ($this) {
            self::Owner => 3,
            self::Moderator => 2,
            self::Viewer => 1,
        };
    }

    public function atLeast(self $role): bool
    {
        return $this->rank() >= $role->rank();
    }

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Sahip',
            self::Moderator => 'Moderatör',
            self::Viewer => 'İzleyici',
        };
    }
}
