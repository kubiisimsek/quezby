<?php

use App\Enums\AdminRole;
use App\Enums\Locale;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\FakeIdentityProvider;

/*
| The language a player route answers in (`ResolveLocale`): the first of
| the six that `Accept-Language` names, else the signed-in player's, else
| Turkish — a 401 and a 429 too. The admin panel and the ops routes stay
| Turkish. An account keeps the language it was made in until its phone
| says otherwise (`PUT /me/locale`).
*/

/** A guest sign-up from a phone that is neither: a validation line, in whatever the request speaks. */
function signUpOnWindows(string $acceptLanguage): TestResponse
{
    return test()->withHeader('Accept-Language', $acceptLanguage)
        ->postJson('/api/v1/auth/guest', ['platform' => 'windows', 'installId' => 'install-1']);
}

/** A search one letter long: `messages.search`, in whatever the request speaks. */
function searchTooShort(string $acceptLanguage): TestResponse
{
    return test()->withHeader('Accept-Language', $acceptLanguage)->getJson('/api/v1/users?search=a');
}

test('answers in the language the request names', function (string $acceptLanguage, string $message) {
    $this->assertApiError(signUpOnWindows($acceptLanguage), 422, 'validation_failed')
        ->assertJsonPath('error.fields.platform', [$message])
        ->assertJsonPath('error.message', $message);
})->with([
    'Turkish' => ['tr', 'Seçilen platform geçersiz.'],
    'English' => ['en', 'The selected platform is invalid.'],
    'German' => ['de', 'Plattform ist ungültig.'],
    'Arabic' => ['ar', 'القيمة المختارة في حقل المنصة غير صالحة.'],
    'French' => ['fr', "La valeur du champ plateforme n'est pas valide."],
    'Spanish' => ['es', 'El valor del campo plataforma no es válido.'],
]);

test('reads a regional tag by its language, in the order the header prefers', function (string $acceptLanguage, string $message) {
    signUpOnWindows($acceptLanguage)->assertJsonPath('error.message', $message);
})->with([
    'Austrian German first' => ['de-AT,de;q=0.9', 'Plattform ist ungültig.'],
    'an unspoken language, then French' => ['pt-BR, fr-CA;q=0.8, en;q=0.5', "La valeur du champ plateforme n'est pas valide."],
    'a higher quality further down' => ['en;q=0.4, es-419;q=0.9', 'El valor del campo plataforma no es válido.'],
]);

test('the language the request names wins over the player\'s own', function () {
    $this->signIn(User::factory()->withUsername()->locale(Locale::Fr)->create());

    searchTooShort('de')->assertStatus(422)
        ->assertJsonPath('error.message', 'Gib zum Suchen 2 bis 20 Buchstaben, Ziffern, Punkte oder Sterne ein.');
});

test('a language it does not speak falls back to the player\'s own, then to Turkish', function (string $acceptLanguage) {
    signUpOnWindows($acceptLanguage)->assertJsonPath('error.message', 'Seçilen platform geçersiz.');

    $this->signIn(User::factory()->withUsername()->locale(Locale::Es)->create());
    searchTooShort($acceptLanguage)->assertStatus(422)
        ->assertJsonPath('error.message', 'Para buscar, escribe de 2 a 20 letras, números, puntos o asteriscos.');
})->with([
    'Japanese' => ['ja-JP, ja;q=0.9'],
    'anything' => ['*'],
    'an empty header' => [''],
]);

test('with no language named, a real token says whose language it is — and still counts the day', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
    $player = User::factory()->withUsername()->locale(Locale::Ar)->create();

    $this->withToken($this->tokenFor($player))
        ->withHeaders(['Accept-Language' => '', 'X-Device' => deviceHeaderOf()])
        ->getJson('/api/v1/users?search=a')
        ->assertStatus(422)
        ->assertJsonPath('error.message', 'للبحث، اكتب من 2 إلى 20 حرفًا أو رقمًا أو نقطة أو نجمة.');

    expect(DB::table('player_devices')->where('user_id', $player->id)->count())->toBe(1);
});

test('a missing token is refused in the request\'s language', function (string $acceptLanguage, string $message) {
    $this->assertApiError($this->withHeader('Accept-Language', $acceptLanguage)->getJson('/api/v1/me'), 401, 'unauthenticated')
        ->assertJsonPath('error.message', $message);
})->with([
    'German' => ['de', 'Deine Sitzung ist abgelaufen. Melde dich erneut an.'],
    'Arabic' => ['ar', 'انتهت جلستك. سجّل الدخول من جديد.'],
]);

test('too many requests are refused in the request\'s language', function (string $acceptLanguage, string $message) {
    $this->withHeader('Accept-Language', $acceptLanguage);
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'guess-'.$i])->assertStatus(422);
    }

    $this->assertApiError($this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'guess-11']), 429, 'too_many_requests')
        ->assertJsonPath('error.message', $message);
})->with([
    'German' => ['de', 'Du hast zu viele Anfragen gesendet. Warte kurz und versuch es noch mal.'],
    'Arabic' => ['ar', 'أرسلت طلبات كثيرة جدًا. انتظر قليلًا ثم حاول مرة أخرى.'],
]);

test('a signed-in player\'s throttle speaks their request\'s language too', function () {
    $this->signIn();
    $this->withHeader('Accept-Language', 'ar');
    for ($i = 0; $i < 10; $i++) {
        $this->deleteJson('/api/v1/me/identities/apple')->assertOk();
    }

    $this->assertApiError($this->deleteJson('/api/v1/me/identities/apple'), 429, 'too_many_requests')
        ->assertJsonPath('error.message', 'أرسلت طلبات كثيرة جدًا. انتظر قليلًا ثم حاول مرة أخرى.');
});

test('the admin panel stays Turkish, whatever the browser asks for', function () {
    $this->withHeader('Accept-Language', 'de-DE,de;q=0.9,en;q=0.8');

    $this->assertApiError($this->getJson('/api/v1/admin/me'), 401, 'unauthenticated')
        ->assertJsonPath('error.message', 'Oturumun geçersiz, lütfen yeniden giriş yap.');

    $this->signInAdmin(AdminRole::Viewer);
    $this->assertApiError($this->getJson('/api/v1/admin/players?perPage=101'), 422, 'validation_failed')
        ->assertJsonPath('error.fields.perPage', ['Sayfa boyutu en fazla 100 olabilir.']);
});

test('the ops routes stay Turkish', function () {
    $this->assertApiError($this->withHeader('Accept-Language', 'fr')->postJson('/api/v1/ops/moderate', ['action' => 'held']), 404, 'not_found')
        ->assertJsonPath('error.message', 'Aradığın şey bulunamadı.');
});

test('puts the app\'s language back after every request', function () {
    $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/health')->assertOk();
    expect(app()->getLocale())->toBe('tr');

    signUpOnWindows('de')->assertStatus(422);
    expect(app()->getLocale())->toBe('tr')->and(config('app.locale'))->toBe('tr');

    $this->assertApiError($this->withHeader('Accept-Language', 'fr')->getJson('/api/v1/me'), 401, 'unauthenticated');
    expect(Locale::current())->toBe(Locale::Tr);
});

test('a new guest plays in the language it signed up in', function (string $acceptLanguage, string $locale) {
    $response = $this->withHeader('Accept-Language', $acceptLanguage)
        ->postJson('/api/v1/auth/guest', ['platform' => 'ios', 'installId' => 'install-1'])
        ->assertCreated()
        ->assertJsonPath('user.locale', $locale);

    $this->assertDatabaseHas('users', ['id' => $response->json('user.id'), 'locale' => $locale]);
})->with([
    'German' => ['de', 'de'],
    'Latin American Spanish' => ['es-419,es;q=0.9', 'es'],
    'Arabic' => ['ar-SA', 'ar'],
    'a language it does not speak' => ['ja', 'tr'],
]);

test('signing in with an email keeps the player\'s language', function () {
    $player = User::factory()->withUsername()->linked('kubi@example.com', 'secret-password')->locale(Locale::Fr)->create();

    $this->withHeader('Accept-Language', 'de')
        ->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'secret-password'])
        ->assertOk()
        ->assertJsonPath('user.locale', 'fr');

    expect($player->fresh()->locale)->toBe(Locale::Fr);
});

test('a new Apple player plays in the request\'s language, and keeps it when they come back', function () {
    $idp = FakeIdentityProvider::install();

    $first = $this->withHeader('Accept-Language', 'ar')
        ->postJson('/api/v1/auth/apple', $idp->appleSignIn())
        ->assertCreated()
        ->assertJsonPath('user.locale', 'ar');

    $this->withHeader('Accept-Language', 'de')
        ->postJson('/api/v1/auth/apple', $idp->appleSignIn(body: ['installId' => 'new-phone']))
        ->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('user.locale', 'ar');
    $this->assertDatabaseHas('users', ['id' => $first->json('user.id'), 'locale' => 'ar']);
});

test('a new Google player plays in the request\'s language, and keeps it when they come back', function () {
    $idp = FakeIdentityProvider::install();

    $first = $this->withHeader('Accept-Language', 'es')
        ->postJson('/api/v1/auth/google', $idp->googleSignIn())
        ->assertCreated()
        ->assertJsonPath('user.locale', 'es');

    $this->withHeader('Accept-Language', 'en')
        ->postJson('/api/v1/auth/google', $idp->googleSignIn(body: ['platform' => 'ios']))
        ->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('user.locale', 'es');
    $this->assertDatabaseHas('users', ['id' => $first->json('user.id'), 'locale' => 'es']);
});

test('the phone sets the player\'s language', function (string $locale) {
    $player = $this->signIn();

    $this->putJson('/api/v1/me/locale', ['locale' => $locale])
        ->assertOk()
        ->assertJsonPath('user.id', $player->id)
        ->assertJsonPath('user.locale', $locale)
        ->assertJsonStructure(['user' => ['id', 'username', 'settings', 'locale', 'best', 'createdAt']]);

    expect($player->fresh()->locale)->toBe(Locale::from($locale));
})->with(['tr', 'en', 'de', 'ar', 'fr', 'es']);

test('the language set is the one a request naming none gets', function () {
    $this->signIn();
    $this->putJson('/api/v1/me/locale', ['locale' => 'de'])->assertOk();

    searchTooShort('')->assertJsonPath('error.message', 'Gib zum Suchen 2 bis 20 Buchstaben, Ziffern, Punkte oder Sterne ein.');
});

test('only the six languages can be set', function (mixed $locale) {
    $player = $this->signIn(User::factory()->withUsername()->locale(Locale::En)->create());

    $this->assertApiError($this->putJson('/api/v1/me/locale', ['locale' => $locale]), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['locale']]]);
    expect($player->fresh()->locale)->toBe(Locale::En);
})->with(['pt', 'TR', 'de-AT', '', null, 7]);

test('refuses an unknown language in the request\'s own', function () {
    $this->signIn();

    $this->withHeader('Accept-Language', 'en')->putJson('/api/v1/me/locale', ['locale' => 'pt'])
        ->assertJsonPath('error.fields.locale', ['The selected language is invalid.']);
    $this->withHeader('Accept-Language', 'tr')->putJson('/api/v1/me/locale', ['locale' => 'pt'])
        ->assertJsonPath('error.fields.locale', ['Seçilen dil geçersiz.']);
});

test('setting the language needs a player', function () {
    $this->assertApiError($this->putJson('/api/v1/me/locale', ['locale' => 'de']), 401, 'unauthenticated');
});

test('me says the player\'s language, Turkish for an account nobody set one for', function () {
    $this->signIn(User::factory()->withUsername()->create());
    $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('user.locale', 'tr');

    $this->signIn(User::factory()->withUsername()->locale('ar')->create());
    $this->withHeader('Accept-Language', 'en')->getJson('/api/v1/me')->assertOk()->assertJsonPath('user.locale', 'ar');
});
