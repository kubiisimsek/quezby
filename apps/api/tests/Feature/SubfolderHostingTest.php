<?php

/*
| In production the API's zip is extracted into public_html/api, so
| https://quezby.com/api/v1/… reaches Laravel through the zip's root
| .htaccess as /api/public/index.php. Symfony finds no base path in that
| script name and the routes keep their /api prefix
| (docs/deployment/shared-hosting.md).
*/

test('answers under quezby.com/api when the zip is extracted into public_html/api', function () {
    $this->call('GET', 'https://quezby.com/api/v1/health', server: [
        'SCRIPT_NAME' => '/api/public/index.php',
        'SCRIPT_FILENAME' => '/home/quezby/public_html/api/public/index.php',
        'PHP_SELF' => '/api/public/index.php',
    ])
        ->assertOk()
        ->assertJsonPath('status', 'ok');
});

test('builds its links on quezby.com/api, not on the folder it runs from', function () {
    $this->call('GET', 'https://quezby.com/api/v1/health', server: [
        'SCRIPT_NAME' => '/api/public/index.php',
        'SCRIPT_FILENAME' => '/home/quezby/public_html/api/public/index.php',
        'PHP_SELF' => '/api/public/index.php',
    ]);

    expect(url('/api/v1/media/avatars/0123456789abcdef01234567.jpg'))
        ->toBe('https://quezby.com/api/v1/media/avatars/0123456789abcdef01234567.jpg');
});

test('loses its routes if only public/ is copied into public_html/api', function () {
    // Laravel would then take /api as its base path and look for /v1/health.
    $this->call('GET', 'https://quezby.com/api/v1/health', server: [
        'SCRIPT_NAME' => '/api/index.php',
        'SCRIPT_FILENAME' => '/home/quezby/public_html/api/index.php',
        'PHP_SELF' => '/api/index.php',
    ])->assertNotFound();
});
