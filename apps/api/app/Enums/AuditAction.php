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
