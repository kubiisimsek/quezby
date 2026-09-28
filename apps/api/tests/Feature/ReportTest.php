<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\ReportStatus;
use App\Models\AuditEntry;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('avatars');
    $this->player = User::factory()->withUsername('kotu.foto')->create(['avatar' => str_repeat('a', 24).'.jpg']);
    Storage::disk('avatars')->put(str_repeat('a', 24).'.jpg', 'jpeg');
});

test('a player reports a photo or a name, each once', function () {
    $me = $this->signIn();

    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'photo'])->assertNoContent();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'photo'])->assertNoContent();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name'])->assertNoContent();

    expect(Report::query()->orderBy('reason')->get(['reporter_id', 'reported_id', 'reason', 'subject', 'status'])->map(fn (Report $report) => [
        $report->reporter_id, $report->reported_id, $report->reason->value, $report->subject, $report->status->value,
    ])->all())->toBe([
        [$me->id, $this->player->id, 'name', 'kotu.foto', 'open'],
        [$me->id, $this->player->id, 'photo', str_repeat('a', 24).'.jpg', 'open'],
    ]);
});

test('a player without a photo has none to report; nobody reports themselves or the unknown', function () {
    $this->signIn(User::factory()->withUsername('kendim')->create());
    User::factory()->withUsername('fotosuz')->create();

    $this->postJson('/api/v1/users/fotosuz/report', ['reason' => 'photo'])->assertNoContent();
    $this->assertApiError($this->postJson('/api/v1/users/kendim/report', ['reason' => 'name']), 404, 'not_found');
    $this->assertApiError($this->postJson('/api/v1/users/kimse.yok/report', ['reason' => 'name']), 404, 'not_found');
    $this->assertApiError($this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'hakaret']), 422, 'validation_failed');
    expect(Report::query()->count())->toBe(0);
});

test('reports are throttled', function () {
    $this->signIn();
    foreach (range(1, 10) as $i) {
        $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name'])->assertNoContent();
    }

    $this->assertApiError($this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name']), 429, 'too_many_requests');
});

test('the panel lists reported players, the newest trouble first', function () {
    foreach (User::factory()->withUsername()->count(2)->create() as $reporter) {
        $this->signIn($reporter);
        $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'photo'])->assertNoContent();
    }
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name'])->assertNoContent();

    $this->signInAdmin(AdminRole::Viewer);
    $this->getJson('/api/v1/admin/reports')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.player.username', 'kotu.foto')
        ->assertJsonPath('items.0.reasons', ['photo' => 2, 'name' => 1])
        ->assertJsonPath('items.0.reports', 3)
        ->assertJsonPath('items.0.avatarUrl', url('/api/v1/media/avatars/'.str_repeat('a', 24).'.jpg'));
    $this->getJson('/api/v1/admin/counts')->assertJsonPath('reports', 1);
    $this->getJson('/api/v1/admin/reports?status=resolved')->assertJsonPath('total', 0);
});

test('a moderator takes a photo down: the file goes, its reports close, the audit log says who', function () {
    $this->signIn();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'photo'])->assertNoContent();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name'])->assertNoContent();
    $admin = $this->signInAdmin(AdminRole::Moderator);

    $this->postJson("/api/v1/admin/players/{$this->player->id}/avatar/remove", ['reason' => 'Uygunsuz fotoğraf'])->assertOk()->assertJsonPath('changed', true);
    $this->postJson("/api/v1/admin/players/{$this->player->id}/avatar/remove", ['reason' => 'Uygunsuz fotoğraf'])->assertOk()->assertJsonPath('changed', false);

    expect($this->player->refresh()->avatar)->toBeNull()
        ->and(Storage::disk('avatars')->allFiles())->toBe([])
        ->and(Report::query()->where('reason', 'photo')->value('status'))->toBe(ReportStatus::Resolved)
        ->and(Report::query()->where('reason', 'photo')->value('resolved_by'))->toBe($admin->id)
        ->and(Report::query()->where('reason', 'name')->value('status'))->toBe(ReportStatus::Open);
    $entry = AuditEntry::query()->where('action', AuditAction::AvatarRemove)->sole();
    expect($entry->reason)->toBe('Uygunsuz fotoğraf');
});

test('resetting a name closes the reports about it; dismissing lets the rest go', function () {
    $this->signIn();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'name'])->assertNoContent();
    $this->postJson('/api/v1/users/kotu.foto/report', ['reason' => 'photo'])->assertNoContent();
    $this->signInAdmin(AdminRole::Moderator);

    $this->postJson("/api/v1/admin/players/{$this->player->id}/rename", ['reason' => 'Uygunsuz ad'])->assertOk();
    expect(Report::query()->where('reason', 'name')->value('status'))->toBe(ReportStatus::Resolved);

    $this->postJson("/api/v1/admin/players/{$this->player->id}/reports/dismiss", ['reason' => 'Fotoğrafta sorun yok'])->assertOk()->assertJsonPath('changed', true);
    $this->postJson("/api/v1/admin/players/{$this->player->id}/reports/dismiss", ['reason' => 'Fotoğrafta sorun yok'])->assertOk()->assertJsonPath('changed', false);
    expect(Report::query()->where('reason', 'photo')->value('status'))->toBe(ReportStatus::Dismissed)
        ->and(AuditEntry::query()->where('action', AuditAction::ReportsDismiss)->count())->toBe(1);
    $this->getJson("/api/v1/admin/players/{$this->player->id}")->assertJsonPath('openReports', ['photo' => 0, 'name' => 0]);
});

test('taking a photo down and dismissing need a reason', function () {
    $this->signInAdmin(AdminRole::Moderator);

    $this->assertApiError($this->postJson("/api/v1/admin/players/{$this->player->id}/avatar/remove", []), 422, 'validation_failed');
    $this->assertApiError($this->postJson("/api/v1/admin/players/{$this->player->id}/reports/dismiss", ['reason' => 'x']), 422, 'validation_failed');
});
