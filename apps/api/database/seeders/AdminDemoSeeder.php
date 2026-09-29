<?php

namespace Database\Seeders;

use App\Content\Catalog;
use App\Enums\AdminRole;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\EndReason;
use App\Game\Rules;
use App\Models\Admin;
use App\Models\Run;
use App\Models\User;
use App\Services\ModerationService;
use App\Services\Rating\RatingService;
use App\Support\Actor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Local demo data for the admin panel: an account for each role, and what
 * the anti-cheat has to show — bots with flagged runs, a second account on a
 * bot's phone, a phone that failed its device check, a banned player — plus
 * the moderation that went with them, on the audit log.
 *
 *     php artisan db:seed --class=DemoSeeder        # the players, first
 *     php artisan db:seed --class=AdminDemoSeeder
 *
 * Sign in at http://localhost:5180 as owner@quezby.test, moderator@quezby.test
 * or viewer@quezby.test — password `password`. Local only; does nothing the
 * second time.
 */
final class AdminDemoSeeder extends Seeder
{
    public const PASSWORD = 'password';

    /** @var array<string, array{0: string, 1: AdminRole}> email → name, role */
    private const ADMINS = [
        'owner@quezby.test' => ['Panel Sahibi', AdminRole::Owner],
        'moderator@quezby.test' => ['Moderatör Ekin', AdminRole::Moderator],
        'viewer@quezby.test' => ['İzleyici Deniz', AdminRole::Viewer],
    ];

    public function run(ModerationService $moderation): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('AdminDemoSeeder only runs locally (APP_ENV=local): it makes admin accounts with a known password.');
        }
        if (Admin::query()->where('email', 'owner@quezby.test')->exists()) {
            $this->command?->outputComponents()->warn('The demo admins are already here; nothing to do.');

            return;
        }

        DB::transaction(function () use ($moderation) {
            foreach (self::ADMINS as $email => [$name, $role]) {
                Admin::query()->create([
                    'name' => $name,
                    'email' => $email,
                    'password' => self::PASSWORD,
                    'role' => $role,
                    'must_change_password' => false,
                ]);
            }

            $speedy = $this->player('bot.hizli', 'android', 'install-bot-1');
            $steady = $this->player('bot.ritim', 'ios', 'install-bot-2');
            $twin = $this->player('bot.ikiz', 'ios', 'install-bot-2');
            $rooted = $this->player('root.telefon', 'android', 'install-rooted');
            $cheat = $this->player('yasakli.hesap', 'android', 'install-cheat');

            // The bot plays Dereceli: every flagged run of it is a forfeit on its Elo.
            foreach (range(1, 4) as $hour) {
                $this->playedRun($speedy, RunStatus::Flagged, 180_000 + $hour * 7_000, $hour, [
                    ['code' => 'fast_decisions', 'fast' => 44, 'samples' => 60, 'severity' => 'hard'],
                    ['code' => 'wall_clock', 'elapsedMs' => 61_000, 'neededMs' => 190_000, 'severity' => 'hard'],
                ], RunMode::Rated);
            }
            $this->playedRun($speedy, RunStatus::Flagged, 240_000, 30, [
                ['code' => 'client_mismatch', 'serverScore' => 240_000, 'clientScore' => 900_000, 'serverReels' => 300, 'clientReels' => 900, 'severity' => 'hard'],
            ], RunMode::Rated);
            $this->playedRun($steady, RunStatus::Ranked, 90_000, 5, [
                ['code' => 'reaction_cv', 'cv' => 0.04, 'samples' => 80, 'severity' => 'soft'],
            ]);
            $this->playedRun($steady, RunStatus::Flagged, 150_000, 8, [
                ['code' => 'slow_motion', 'reel' => 120, 'elapsedMs' => 900_000, 'neededMs' => 300_000, 'limitMs' => 415_000, 'severity' => 'hard'],
            ]);
            $this->playedRun($twin, RunStatus::Ranked, 20_000, 3, [
                ['code' => 'daily_shared_install', 'severity' => 'soft'],
            ], RunMode::Daily);
            $rejected = $this->playedRun($twin, RunStatus::Ranked, 70_000, 6, []);
            $this->playedRun($rooted, RunStatus::Flagged, 60_000, 2, [['code' => 'device_integrity', 'severity' => 'hard']]);
            foreach (range(1, 3) as $day) {
                $rooted->deviceChecks()->create([
                    'platform' => 'android',
                    'verdict' => 'fail',
                    'reason' => 'device',
                    'details' => ['device' => ['MEETS_BASIC_INTEGRITY'], 'app' => 'UNRECOGNIZED_VERSION'],
                    'checked_at' => now()->subDays($day),
                    'expires_at' => now()->subDays($day)->addHours(12),
                ]);
            }
            $this->playedRun($cheat, RunStatus::Flagged, 400_000, 12, [
                ['code' => 'checkpoint_forged', 'receipt' => 1, 'severity' => 'hard'],
            ]);

            // The suspects' runs count as the finish would have counted them: a
            // rated run flagged for how it was played is a forfeit.
            $ratings = app(RatingService::class);
            Run::query()
                ->with('user')
                ->whereIn('user_id', [$speedy->id, $steady->id, $twin->id, $rooted->id, $cheat->id])
                ->orderBy('finished_at')
                ->each(fn (Run $run) => $ratings->forFinishedRun($run));

            $cli = Actor::cli();
            $moderation->reject($rejected->load('user'), 'Aynı telefondan ikinci hesap, skor şüpheli', $cli);
            $moderation->ban($cheat, 'Sahte kontrol noktası makbuzu', $cli);
        });

        $this->command?->outputComponents()->info(
            'Admin demo: owner@quezby.test, moderator@quezby.test and viewer@quezby.test (password "'.self::PASSWORD.'"), five suspects, a ban and a rejection on the audit log.',
        );
    }

    private function player(string $username, string $platform, string $install): User
    {
        return User::query()->forceCreate([
            'username' => $username,
            'platform' => $platform,
            'install_id' => $install,
            'created_at' => now()->subDays(6),
        ]);
    }

    /**
     * A finished run of `$player`, `$hoursAgo` hours ago, with `$flags` on it.
     *
     * @param  list<array<string, mixed>>  $flags
     */
    private function playedRun(User $player, RunStatus $status, int $score, int $hoursAgo, array $flags, RunMode $mode = RunMode::Free): Run
    {
        $finished = now()->subHours($hoursAgo);
        $reels = intdiv($score, 800);

        return Run::query()->forceCreate([
            'user_id' => $player->id,
            'seed' => random_int(1, 4_294_967_295),
            'engine_version' => Rules::ENGINE_VERSION,
            'content_version' => Catalog::LATEST,
            'app_version' => '1.0.0',
            'status' => $status,
            'mode' => $mode,
            'daily_key' => $mode === RunMode::Daily ? $finished->setTimezone('Europe/Istanbul')->format('Y-m-d') : null,
            'started_at' => $finished->copy()->subMinutes(5),
            'finished_at' => $finished,
            'score' => $score,
            'reels' => $reels,
            'hits' => $reels,
            'misses' => 0,
            'perfects' => intdiv($reels, 10),
            'max_streak' => $reels,
            'max_combo' => 3000,
            'bonus_points' => 0,
            'level' => 1 + intdiv(max(0, $reels - 1), Rules::LEVEL_EVERY),
            'accuracy' => 1000,
            'avg_reaction_ms' => 240,
            'active_ms' => $reels * 500,
            'ended_by' => EndReason::Drained,
            'client_score' => $score,
            'client_reels' => $reels,
            'flags' => $flags === [] ? null : $flags,
        ]);
    }
}
