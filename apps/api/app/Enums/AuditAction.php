<?php

namespace App\Enums;

/** `AdminAuditAction` in `packages/types`: everything the audit log records. */
enum AuditAction: string
{
    case Login = 'auth.login';
    case PasswordChanged = 'auth.password_changed';
    case PlayerBan = 'player.ban';
    case PlayerUnban = 'player.unban';
    case PlayerRename = 'player.rename';
    case PlayerSignOut = 'player.sign_out';
    case PlayerDelete = 'player.delete';
    case AvatarRemove = 'player.avatar_remove';
    case ReportsDismiss = 'player.reports_dismiss';
    /** An owner set a player's rating (qb) by hand; `details` holds `from`, `to`, `tierFrom` and `tierTo`. */
    case PlayerRating = 'player.rating';
    /** An owner sent a player's phones a push from the panel; `details` holds the words and what Firebase said. */
    case PlayerPush = 'player.push';
    case RunApprove = 'run.approve';
    case RunReject = 'run.reject';
    case AdminCreate = 'admin.create';
    case AdminUpdate = 'admin.update';
    case AdminResetPassword = 'admin.reset_password';
    case SystemMigrate = 'system.migrate';
    case SystemOptimize = 'system.optimize';
    case SystemExpireRuns = 'system.expire_runs';
    case SystemAnalyticsPrune = 'system.analytics_prune';
}
