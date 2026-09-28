<?php

namespace App\Services\Avatars;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\User;
use GdImage;
use Illuminate\Container\Attributes\Config;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Profile photos. The phone crops, scales and squeezes a photo before it
 * sends it; the API trusts none of it: it decodes what arrives, crops it
 * square from the middle, scales it to at most `avatars.size` and encodes a
 * fresh JPEG — which drops every byte of metadata, EXIF and location
 * included — lowering the quality until it fits in `avatars.max_bytes`. A
 * new photo gets a new name, so its address never changes under a cache.
 */
final class AvatarService
{
    /** A photo's file name: 24 random hex characters. */
    public const FILE = '/^[0-9a-f]{24}\.jpg$/';

    /**
     * @param  list<int>  $qualities
     */
    public function __construct(
        #[Config('quezby.avatars.disk')]
        private readonly string $disk,
        #[Config('quezby.avatars.size')]
        private readonly int $size,
        #[Config('quezby.avatars.max_bytes')]
        private readonly int $maxBytes,
        #[Config('quezby.avatars.min_side')]
        private readonly int $minSide,
        #[Config('quezby.avatars.max_side')]
        private readonly int $maxSide,
        #[Config('quezby.avatars.qualities')]
        private readonly array $qualities,
    ) {}

    /**
     * Makes `$bytes` the player's photo and drops the one before it. A file
     * that is not a JPEG, PNG or WebP photo of a sensible size, or does not
     * fit after all, is `photo_invalid`.
     */
    public function store(User $user, string $bytes): void
    {
        $jpeg = $this->encode($bytes);
        $name = bin2hex(random_bytes(12)).'.jpg';
        if (! $this->files()->put($name, $jpeg)) {
            throw ApiException::of(ErrorCode::ServerError);
        }

        $previous = $user->avatar;
        $user->forceFill(['avatar' => $name])->save();
        $this->forget($previous);
    }

    /** Takes the player's photo away, file and all. */
    public function remove(User $user): void
    {
        $previous = $user->avatar;
        if ($previous === null) {
            return;
        }
        $user->forceFill(['avatar' => null])->save();
        $this->forget($previous);
    }

    /** Deletes a photo's file, if there is one. */
    public function forget(?string $name): void
    {
        if ($name !== null && preg_match(self::FILE, $name) === 1) {
            $this->files()->delete($name);
        }
    }

    /** Where a photo is served; null for none. */
    public static function url(?string $name): ?string
    {
        return $name === null ? null : url('/api/v1/media/avatars/'.$name);
    }

    public function files(): Filesystem
    {
        return Storage::disk($this->disk);
    }

    /** The photo as the API keeps it: a square JPEG of at most `size` pixels and `max_bytes`. */
    public function encode(string $bytes): string
    {
        if ($bytes === '' || strlen($bytes) > $this->maxBytes) {
            throw ApiException::of(ErrorCode::PhotoInvalid);
        }
        $info = @getimagesizefromstring($bytes);
        if ($info === false
            || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)
            || min($info[0], $info[1]) < $this->minSide
            || max($info[0], $info[1]) > $this->maxSide) {
            throw ApiException::of(ErrorCode::PhotoInvalid);
        }
        $source = @imagecreatefromstring($bytes);
        if (! $source instanceof GdImage) {
            throw ApiException::of(ErrorCode::PhotoInvalid);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);
        foreach ([min($side, $this->size), min($side, intdiv($this->size * 3, 4))] as $target) {
            $square = imagecreatetruecolor($target, $target);
            // A see-through PNG lands on white: a JPEG has no transparency.
            imagefill($square, 0, 0, (int) imagecolorallocate($square, 255, 255, 255));
            imagecopyresampled($square, $source, 0, 0, intdiv($width - $side, 2), intdiv($height - $side, 2), $target, $target, $side, $side);

            foreach ($this->qualities as $quality) {
                ob_start();
                imagejpeg($square, null, $quality);
                $jpeg = (string) ob_get_clean();
                if (strlen($jpeg) <= $this->maxBytes) {
                    return $jpeg;
                }
            }
        }

        throw ApiException::of(ErrorCode::PhotoInvalid);
    }
}
