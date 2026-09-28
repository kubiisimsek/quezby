<?php

use App\Models\User;
use App\Services\Avatars\AvatarService;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('avatars');
});

/** A photo drawn with GD: `$width`×`$height`, a gradient — or a 1px checkerboard, which JPEG squeezes badly. */
function avatarPhoto(int $width, int $height, string $type = 'jpeg', bool $checkerboard = false, bool $transparent = false): string
{
    $image = imagecreatetruecolor($width, $height);
    if ($transparent) {
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
    } elseif ($checkerboard) {
        for ($y = 0; $y < $height; $y++) {
            for ($x = $y % 2; $x < $width; $x += 2) {
                imagesetpixel($image, $x, $y, 0xFFFFFF);
            }
        }
    } else {
        // A few colours, blown up smooth: a photo-like gradient, drawn fast.
        $seed = imagecreatetruecolor(8, 6);
        for ($y = 0; $y < 6; $y++) {
            for ($x = 0; $x < 8; $x++) {
                imagesetpixel($seed, $x, $y, ($x * 32) << 16 | ($y * 40) << 8 | 0x80);
            }
        }
        imagecopyresampled($image, $seed, 0, 0, 0, 0, $width, $height, 8, 6);
    }
    ob_start();
    match ($type) {
        'png' => imagepng($image, null, 9),
        'gif' => imagegif($image),
        default => imagejpeg($image, null, 90),
    };

    return (string) ob_get_clean();
}

/** A JPEG with an EXIF block that says where it was taken, right after its start. */
function avatarWithExif(string $jpeg): string
{
    $exif = "Exif\0\0GPS 41.0082 N 28.9784 E";

    return substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($exif) + 2).$exif.substr($jpeg, 2);
}

function storedAvatar(User $user): string
{
    return (string) Storage::disk('avatars')->get((string) $user->refresh()->avatar);
}

test('a photo becomes a square JPEG of at most 100 KB, cut from the middle, without its EXIF', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $photo = avatarWithExif(avatarPhoto(1024, 768));
    expect($photo)->toContain('GPS 41.0082');

    $response = $this->putJson('/api/v1/me/avatar', ['image' => base64_encode($photo)])->assertOk();

    expect($response->json('user.avatarUrl'))->toMatch('~/api/v1/media/avatars/[0-9a-f]{24}\.jpg$~');
    $stored = storedAvatar($me);
    $info = getimagesizefromstring($stored);
    expect(strlen($stored))->toBeLessThanOrEqual(102_400)
        ->and([$info[0], $info[1], $info[2]])->toBe([512, 512, IMAGETYPE_JPEG])
        ->and($stored)->not->toContain('GPS 41.0082')
        ->and($stored)->not->toContain('Exif');
});

test('a small photo is not blown up, and see-through lands on white', function () {
    $me = $this->signIn();

    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(300, 200, 'png', transparent: true))])->assertOk();

    $image = imagecreatefromstring(storedAvatar($me));
    expect([imagesx($image), imagesy($image)])->toBe([200, 200])
        ->and(imagecolorat($image, 10, 10) & 0xFFFFFF)->toBeGreaterThan(0xF0F0F0);
});

test('a photo that does not fit at full quality is squeezed until it does', function () {
    $me = $this->signIn();
    $photo = avatarPhoto(512, 512, 'png', checkerboard: true);
    expect(strlen($photo))->toBeLessThan(10_000);

    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode($photo)])->assertOk();

    expect(strlen(storedAvatar($me)))->toBeLessThanOrEqual(102_400)->toBeGreaterThan(80_000);
});

test('a new photo takes the old one\'s place, and its file goes', function () {
    $me = $this->signIn();
    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(400, 400))])->assertOk();
    $first = $me->refresh()->avatar;

    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(600, 600))])->assertOk();

    expect($me->refresh()->avatar)->not->toBe($first)
        ->and(Storage::disk('avatars')->exists($first))->toBeFalse()
        ->and(Storage::disk('avatars')->allFiles())->toHaveCount(1);
});

test('taking the photo away, as often as asked', function () {
    $me = $this->signIn();
    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(400, 400))])->assertOk();

    $this->deleteJson('/api/v1/me/avatar')->assertOk()->assertJsonPath('user.avatarUrl', null);
    $this->deleteJson('/api/v1/me/avatar')->assertOk()->assertJsonPath('user.avatarUrl', null);

    expect($me->refresh()->avatar)->toBeNull()
        ->and(Storage::disk('avatars')->allFiles())->toBe([]);
});

test('anything but a photo of a sensible size is photo_invalid', function (Closure $image) {
    $me = $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/avatar', ['image' => $image()]), 422, 'photo_invalid');
    expect($me->refresh()->avatar)->toBeNull();
})->with([
    'not a photo' => [fn () => base64_encode(random_bytes(2000))],
    'too small to see' => [fn () => base64_encode(avatarPhoto(64, 64))],
    'a GIF' => [fn () => base64_encode(avatarPhoto(300, 300, 'gif'))],
    'more than 100 KB' => [fn () => base64_encode(str_repeat('a', 102_401))],
    'not base64' => [fn () => '!!!not base64!!!'],
]);

test('no photo at all is a validation error', function () {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/avatar', []), 422, 'validation_failed');
});

test('a photo is served to anyone with its address, cached for a year', function () {
    $me = $this->signIn();
    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(400, 400))])->assertOk();
    $file = $me->refresh()->avatar;
    $this->app['auth']->forgetGuards();

    $response = $this->get("/api/v1/media/avatars/{$file}")->assertOk();

    expect($response->headers->get('Content-Type'))->toBe('image/jpeg')
        ->and($response->headers->get('Cache-Control'))->toContain('max-age=31536000')
        ->and($response->headers->get('Cache-Control'))->toContain('immutable')
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->getContent())->toBe(storedAvatar($me));
    $this->assertApiError($this->getJson('/api/v1/media/avatars/'.str_repeat('0', 24).'.jpg'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/media/avatars/..%2F.env'), 404, 'not_found');
});

test('other players see the photo on a board, a card and a search', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(400, 400))])->assertOk();
    $this->recordRanked($me, 5000);
    $url = AvatarService::url($me->refresh()->avatar);

    $this->signIn(User::factory()->withUsername('bakan')->create());
    $this->getJson('/api/v1/users/ben')->assertJsonPath('player.avatarUrl', $url);
    $this->getJson('/api/v1/users?search=be')->assertJsonPath('users.0.avatarUrl', $url);
    $this->getJson('/api/v1/leaderboards/weekly')->assertJsonPath('entries.0.avatarUrl', $url);
});

test('deleting the account deletes the photo', function () {
    $me = $this->signIn();
    $this->putJson('/api/v1/me/avatar', ['image' => base64_encode(avatarPhoto(400, 400))])->assertOk();

    $this->deleteJson('/api/v1/me')->assertNoContent();

    expect(Storage::disk('avatars')->allFiles())->toBe([]);
});

test('photos need a player, and are throttled', function () {
    $this->assertApiError($this->putJson('/api/v1/me/avatar', ['image' => 'x']), 401, 'unauthenticated');

    $this->signIn();
    $photo = base64_encode(avatarPhoto(300, 300));
    foreach (range(1, 10) as $i) {
        $this->putJson('/api/v1/me/avatar', ['image' => $photo])->assertOk();
    }
    $this->assertApiError($this->putJson('/api/v1/me/avatar', ['image' => $photo]), 429, 'too_many_requests');
});
