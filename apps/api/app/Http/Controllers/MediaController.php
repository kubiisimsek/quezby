<?php

namespace App\Http\Controllers;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Services\Avatars\AvatarService;
use Illuminate\Http\Response;

class MediaController extends Controller
{
    /**
     * A profile photo, for anyone who has its address — the app hands it out
     * only with a player. A photo is never changed under its name (a new one
     * gets a new name), so it can be cached for a year.
     */
    public function avatar(string $file, AvatarService $avatars): Response
    {
        if (preg_match(AvatarService::FILE, $file) !== 1) {
            throw ApiException::of(ErrorCode::NotFound);
        }
        $bytes = $avatars->files()->get($file);
        if ($bytes === null) {
            throw ApiException::of(ErrorCode::NotFound);
        }

        return response($bytes, 200, [
            'Content-Type' => 'image/jpeg',
            'Content-Length' => (string) strlen($bytes),
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
    }
}
