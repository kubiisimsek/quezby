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

    case RunApprove = 'run.approve';
    case RunReject = 'run.reject';
    case AdminCreate = 'admin.create';
    case AdminUpdate = 'admin.update';
    case AdminResetPassword = 'admin.reset_password';
    case SystemMigrate = 'system.migrate';
    case SystemOptimize = 'system.optimize';
    case SystemExpireRuns = 'system.expire_runs';
    case SystemAnalyticsPrune = 'system.analytics_prune';
    /** An owner sent a push to the players a filter picked; `details` holds the words, the filters and how many. */
    case PushCampaign = 'push.campaign';
    /** An owner stopped a push still going out; `details` holds how far it got. */
    case PushCampaignStop = 'push.campaign_stop';
}
