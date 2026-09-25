<?php

namespace App\Support;

use App\Enums\AuditVia;
use App\Models\Admin;
use Illuminate\Http\Request;

/**
 * Who a moderation or admin action is taken for, as the audit log records
 * it: a signed-in admin in the panel, whoever runs `php artisan`, the holder
 * of an ops token, or the API itself.
 */
final readonly class Actor
{
    private function __construct(
        public AuditVia $via,
        public ?Admin $admin,
        public string $label,
        public ?string $ip,
    ) {}

    public static function panel(Admin $admin, Request $request): self
    {
        return new self(AuditVia::Panel, $admin, $admin->name, $request->ip());
    }

    public static function cli(): self
    {
        return new self(AuditVia::Cli, null, 'Komut satırı', null);
    }

    public static function ops(Request $request): self
    {
        return new self(AuditVia::Ops, null, 'Ops token', $request->ip());
    }

    public static function system(): self
    {
        return new self(AuditVia::System, null, 'Sistem', null);
    }
}
