<?php

namespace App\Services\Push;

use App\Enums\AuditAction;
use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Models\PushCampaign;
use App\Services\Admin\AuditLog;
use App\Services\Logs\SystemLogger;
use App\Support\Actor;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Cache;

/**
 * Pushes from the panel's Push bildirimi page to the players a filter picks
 * (`PushAudience`). Sending writes the campaign and sends nothing yet;
 * `step()` sends the next `push.campaign_batch` phones at once and moves the
 * cursor, until none are left. The open panel page steps it, and so does
 * `php artisan quezby:push-campaigns` from cron — one step at a time per
 * campaign (a lock), so no phone gets it twice. The filter is read again at
 * each step: a player who stops matching on the way is not sent to.
 */
final class PushCampaigns
{
    /** The Firebase errors a campaign keeps, the most frequent. */
    public const ERRORS_KEPT = 20;

    public function __construct(
        private readonly PushAudience $audience,
        private readonly PushService $push,
        private readonly AuditLog $audit,
        private readonly SystemLogger $logger,
        #[Config('quezby.push.campaign_batch')]
        private readonly int $batch,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function start(string $title, string $body, array $filters, Actor $actor): PushCampaign
    {
        $count = $this->audience->count($filters);
        $campaign = PushCampaign::query()->create([
            'admin_id' => $actor->admin?->id,
            'admin_name' => mb_substr($actor->label, 0, 64),
            'title' => $title,
            'body' => $body,
            'filters' => $filters,
            'status' => $count['devices'] === 0 ? PushCampaign::DONE : PushCampaign::SENDING,
            'players' => $count['reachable'],
            'devices' => $count['devices'],
            'cursor' => 0,
            'sent' => 0,
            'failed' => 0,
            'dropped' => 0,
            'finished_at' => $count['devices'] === 0 ? now() : null,
        ]);

        $this->audit->record($actor, AuditAction::PushCampaign, null, details: [
            'campaign' => $campaign->id,
            'title' => $title,
            'body' => $body,
            'filters' => $filters,
            'players' => $count['reachable'],
            'devices' => $count['devices'],
        ]);
        $this->logger->write(LogLevel::Info, LogSource::Push, 'push.campaign', "Kampanya #{$campaign->id} başladı: {$count['reachable']} oyuncu, {$count['devices']} cihaz.", [
            'context' => ['campaign' => $campaign->id, 'title' => $title, 'filters' => $filters],
        ]);

        return $campaign;
    }

    /** Sends the next batch of phones; done once none are left. */
    public function step(PushCampaign $campaign): PushCampaign
    {
        if ($campaign->status !== PushCampaign::SENDING) {
            return $campaign;
        }
        $lock = Cache::lock("push-campaign:{$campaign->id}", 120);
        if (! $lock->get()) {
            return $campaign;
        }

        try {
            $campaign->refresh();
            if ($campaign->status !== PushCampaign::SENDING) {
                return $campaign;
            }
            $tokens = $this->audience->devices($campaign->filters)
                ->where('id', '>', $campaign->cursor)
                ->orderBy('id')
                ->limit($this->batch)
                ->get();

            if ($tokens->isNotEmpty()) {
                $cursor = (int) $tokens->max('id');
                $sent = $this->push->send($tokens, $campaign->title, $campaign->body, ['kind' => 'admin'], 'quezby-admin', logEach: false);
                if ($sent['problem'] !== null) {
                    $campaign->forceFill([
                        'failed' => $campaign->failed + $tokens->count(),
                        'errors' => $this->tally($campaign->errors ?? [], array_fill(0, $tokens->count(), $sent['problem'])),
                        'cursor' => $cursor,
                    ]);
                } else {
                    $failures = array_values(array_filter($sent['results'], fn (array $result) => ! $result['ok']));
                    $campaign->forceFill([
                        'sent' => $campaign->sent + count($sent['results']) - count($failures),
                        'failed' => $campaign->failed + count($failures),
                        'dropped' => $campaign->dropped + count(array_filter($failures, fn (array $result) => $result['dropped'])),
                        'errors' => $this->tally($campaign->errors ?? [], array_map(fn (array $result) => $result['error'] ?? 'status '.($result['status'] ?? '—'), $failures)),
                        'cursor' => $cursor,
                    ]);
                }
            }

            if ($tokens->count() < $this->batch) {
                $campaign->forceFill(['status' => PushCampaign::DONE, 'finished_at' => now()]);
                $this->logger->write(LogLevel::Info, LogSource::Push, 'push.campaign_done', "Kampanya #{$campaign->id} bitti: {$campaign->sent} gitti, {$campaign->failed} gitmedi.", [
                    'context' => ['campaign' => $campaign->id, 'sent' => $campaign->sent, 'failed' => $campaign->failed, 'dropped' => $campaign->dropped],
                ]);
            }
            $campaign->save();

            return $campaign;
        } finally {
            $lock->release();
        }
    }

    /** Every campaign still going out, a step each — what cron runs. Returns how many stepped. */
    public function stepAll(): int
    {
        $campaigns = PushCampaign::query()->where('status', PushCampaign::SENDING)->orderBy('id')->get();
        $campaigns->each(fn (PushCampaign $campaign) => $this->step($campaign));

        return $campaigns->count();
    }

    public function stop(PushCampaign $campaign, Actor $actor): PushCampaign
    {
        if ($campaign->status !== PushCampaign::SENDING) {
            return $campaign;
        }
        $campaign->forceFill(['status' => PushCampaign::STOPPED, 'finished_at' => now()])->save();
        $this->audit->record($actor, AuditAction::PushCampaignStop, null, details: [
            'campaign' => $campaign->id,
            'sent' => $campaign->sent,
            'failed' => $campaign->failed,
            'devices' => $campaign->devices,
        ]);

        return $campaign;
    }

    /**
     * `AdminPushCampaign` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function present(PushCampaign $campaign): array
    {
        $errors = $campaign->errors ?? [];
        arsort($errors);

        return [
            'id' => $campaign->id,
            'title' => $campaign->title,
            'body' => $campaign->body,
            'filters' => (object) $campaign->filters,
            'status' => $campaign->status,
            'players' => $campaign->players,
            'devices' => $campaign->devices,
            'sent' => $campaign->sent,
            'failed' => $campaign->failed,
            'dropped' => $campaign->dropped,
            'errors' => array_map(fn (string $error, int $count) => ['error' => $error, 'count' => $count], array_keys($errors), array_values($errors)),
            'admin' => $campaign->admin_name,
            'createdAt' => Timestamp::iso($campaign->created_at),
            'finishedAt' => Timestamp::iso($campaign->finished_at),
        ];
    }

    /**
     * @param  array<string, int>  $errors
     * @param  list<string>  $new
     * @return array<string, int>
     */
    private function tally(array $errors, array $new): array
    {
        foreach ($new as $error) {
            $key = mb_substr($error, 0, 191);
            $errors[$key] = ($errors[$key] ?? 0) + 1;
        }
        arsort($errors);

        return array_slice($errors, 0, self::ERRORS_KEPT, true);
    }
}
