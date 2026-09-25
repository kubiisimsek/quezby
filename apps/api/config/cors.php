<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS)
|--------------------------------------------------------------------------
|
| The admin panel (apps/admin) is served from its own origin —
| admin.quezby.com — and calls the API with a bearer token, which makes the
| browser ask first (a preflight) before every call. Laravel's defaults,
| except that a preflight's answer is remembered for two hours instead of
| being asked again each time. No cookies cross origins: tokens only.
|
*/

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 7200,

    'supports_credentials' => false,

];
