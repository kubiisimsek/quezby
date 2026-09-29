<?php

use App\Enums\EmailCodePurpose;
use App\Mail\EmailCodeMail;
use App\Models\EmailCode;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/*
| Email accounts: nothing is made until the email is proved with a six-digit
| code, sent in the language the player signed up in. The same codes attach
| an email to an account and reset a forgotten password.
*/

beforeEach(fn () => Mail::fake());

function signUp(string $email = 'kubi@example.com', string $password = 'secret-password'): array
{
    return ['email' => $email, 'password' => $password, 'platform' => 'ios', 'installId' => 'install-123'];
}

test('signing up sends a code and makes no account until it is used', function () {
    $response = $this->postJson('/api/v1/auth/register', signUp('Kubi@Example.com'));

    $response->assertStatus(202)
        ->assertJsonPath('email', 'kubi@example.com')
        ->assertJsonPath('resendIn', 60)
        ->assertJsonStructure(['email', 'resendIn', 'expiresAt'])
        ->assertJsonMissingPath('token');
    $this->assertSame(0, User::query()->count());
    Mail::assertSent(EmailCodeMail::class, fn (EmailCodeMail $mail) => $mail->hasTo('kubi@example.com')
        && $mail->purpose === EmailCodePurpose::Signup
        && $mail->locale === 'tr'
        && preg_match('/^\d{6}$/', $mail->code) === 1);
});

test('the code goes out in the language the player signs up in', function () {
    $this->withHeader('Accept-Language', 'de')->postJson('/api/v1/auth/register', signUp())->assertStatus(202);

    Mail::assertSent(EmailCodeMail::class, fn (EmailCodeMail $mail) => $mail->locale === 'de');
});

test('the right code makes the account in its sign-up language and signs it in', function () {
    $this->withHeader('Accept-Language', 'fr')->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $code = $this->codeSentTo('kubi@example.com');

    $response = $this->withHeader('Accept-Language', 'tr')
        ->postJson('/api/v1/auth/register/verify', ['email' => 'KUBI@example.com', 'code' => $code]);

    $response->assertCreated()
        ->assertJsonPath('user.email', 'kubi@example.com')
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.locale', 'fr');
    $this->assertMatchesRegularExpression('/^guest\d{8}$/', $response->json('user.username'));
    $this->assertDatabaseHas('users', ['email' => 'kubi@example.com', 'platform' => 'ios', 'install_id' => 'install-123']);
    $this->assertSame(0, EmailCode::query()->count());
    $this->withToken($response->json('token'))->getJson('/api/v1/me')->assertOk();

    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'secret-password'])
        ->assertOk()
        ->assertJsonPath('user.id', $response->json('user.id'));
});

test('a wrong code is refused, five wrong tries use the code up, and a new one can still be sent', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $code = $this->codeSentTo('kubi@example.com');
    $wrong = $code === '000000' ? '111111' : '000000';

    for ($try = 1; $try < 5; $try++) {
        $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $wrong]), 422, 'code_invalid');
    }
    $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $wrong]), 422, 'code_expired');
    $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $code]), 422, 'code_expired');
    $this->assertSame(0, User::query()->count());

    // A new code is still one tap away.
    $this->travel(61)->seconds();
    $this->postJson('/api/v1/auth/register/resend', ['email' => 'kubi@example.com'])->assertStatus(202);
    $this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $this->codeSentTo('kubi@example.com')])->assertCreated();
});

test('a code lasts fifteen minutes, and a new one replaces it', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $old = $this->codeSentTo('kubi@example.com');

    $this->travel(16)->minutes();
    $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $old]), 422, 'code_expired');

    $this->postJson('/api/v1/auth/register/resend', ['email' => 'kubi@example.com'])->assertStatus(202)->assertJsonPath('resendIn', 60);
    $new = $this->codeSentTo('kubi@example.com');
    if ($new !== $old) {
        $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $old]), 422, 'code_invalid');
    }
    $this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $new])->assertCreated();
});

test('a new code waits a minute after the last one', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);

    $this->travel(20)->seconds();
    $this->postJson('/api/v1/auth/register/resend', ['email' => 'kubi@example.com'])
        ->assertStatus(202)
        ->assertJsonPath('resendIn', 40);
    Mail::assertSentCount(1);

    $this->travel(41)->seconds();
    $this->postJson('/api/v1/auth/register/resend', ['email' => 'kubi@example.com'])->assertStatus(202)->assertJsonPath('resendIn', 60);
    Mail::assertSentCount(2);
});

test('signing up again while the code is fresh keeps it, and takes the new password', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $code = $this->codeSentTo('kubi@example.com');

    $this->postJson('/api/v1/auth/register', signUp(password: 'another-password'))->assertStatus(202);
    Mail::assertSentCount(1);

    $this->postJson('/api/v1/auth/register/verify', ['email' => 'kubi@example.com', 'code' => $code])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'another-password'])->assertOk();
});

test('a new code for a sign-up that is not waiting is refused', function () {
    $this->assertApiError($this->postJson('/api/v1/auth/register/resend', ['email' => 'nobody@example.com']), 422, 'code_expired');
    $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'nobody@example.com', 'code' => '123456']), 422, 'code_expired');
});

test('an email with an account cannot sign up: before the code, or when one took it in between', function () {
    User::factory()->linked('kubi@example.com')->create();
    $this->assertApiError($this->postJson('/api/v1/auth/register', signUp('KUBI@example.com')), 409, 'email_taken');
    Mail::assertNothingSent();

    $this->postJson('/api/v1/auth/register', signUp('late@example.com'))->assertStatus(202);
    $code = $this->codeSentTo('late@example.com');
    User::factory()->linked('late@example.com')->create();

    $this->assertApiError($this->postJson('/api/v1/auth/register/verify', ['email' => 'late@example.com', 'code' => $code]), 409, 'email_taken');
    $this->assertSame(2, User::query()->count());
});

test('signing up needs an email, a password of eight and more, a platform and an install id', function () {
    $response = $this->postJson('/api/v1/auth/register', ['email' => 'not-an-email', 'password' => 'short', 'platform' => 'windows']);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['email', 'password', 'platform', 'installId']]]);
    Mail::assertNothingSent();
});

test('signing up is throttled per IP', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/auth/register', signUp("player{$i}@example.com"))->assertStatus(202);
    }

    $this->assertApiError($this->postJson('/api/v1/auth/register', signUp('one-too-many@example.com')), 429, 'too_many_requests');
});

test('signing in to a sign-up never verified sends a new code and says so', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $this->travel(2)->minutes();

    $this->assertApiError(
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'secret-password']),
        409,
        'email_unverified',
    );
    Mail::assertSentCount(2);

    $this->assertApiError(
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'wrong-password']),
        422,
        'invalid_credentials',
    );
    Mail::assertSentCount(2);
});

test('codes are kept only as a hash', function () {
    $this->postJson('/api/v1/auth/register', signUp())->assertStatus(202);
    $code = $this->codeSentTo('kubi@example.com');
    $row = EmailCode::query()->sole();

    expect($row->code)->not->toBe($code)->and(strlen($row->code))->toBe(64)
        ->and($row->password)->not->toBe('secret-password');
});

test('a forgotten password: a code in the account language, the new password, every other phone out', function () {
    $user = User::factory()->linked('kubi@example.com', 'old-password')->locale('es')->create();
    $old = $user->createToken('ios')->plainTextToken;

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'Kubi@example.com'])
        ->assertStatus(202)
        ->assertJsonPath('email', 'kubi@example.com');
    Mail::assertSent(EmailCodeMail::class, fn (EmailCodeMail $mail) => $mail->purpose === EmailCodePurpose::Reset && $mail->locale === 'es');
    $code = $this->codeSentTo('kubi@example.com');

    $response = $this->postJson('/api/v1/auth/password/reset', ['email' => 'kubi@example.com', 'code' => $code, 'password' => 'new-password']);

    $response->assertOk()->assertJsonPath('user.id', $user->id);
    $this->app['auth']->forgetGuards();
    $this->assertApiError($this->withToken($old)->getJson('/api/v1/me'), 401, 'unauthenticated');
    $this->app['auth']->forgetGuards();
    $this->withToken($response->json('token'))->getJson('/api/v1/me')->assertOk();
    $this->app['auth']->forgetGuards();
    $this->assertApiError($this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'old-password']), 422, 'invalid_credentials');
    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'new-password'])->assertOk();
});

test('a forgotten password answers the same for an email nobody has, and sends nothing', function () {
    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'nobody@example.com'])
        ->assertStatus(202)
        ->assertJsonStructure(['email', 'resendIn', 'expiresAt']);

    Mail::assertNothingSent();
    $this->assertApiError(
        $this->postJson('/api/v1/auth/password/reset', ['email' => 'nobody@example.com', 'code' => '123456', 'password' => 'new-password']),
        422,
        'code_expired',
    );
});

test('asking again for a reset code waits a minute, and a wrong code is refused', function () {
    User::factory()->linked('kubi@example.com')->create();

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'kubi@example.com'])->assertStatus(202);
    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'kubi@example.com'])->assertStatus(202);
    Mail::assertSentCount(1);
    $code = $this->codeSentTo('kubi@example.com');

    $this->assertApiError(
        $this->postJson('/api/v1/auth/password/reset', ['email' => 'kubi@example.com', 'code' => $code === '000000' ? '111111' : '000000', 'password' => 'new-password']),
        422,
        'code_invalid',
    );
    $this->travel(61)->seconds();
    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'kubi@example.com'])->assertStatus(202);
    Mail::assertSentCount(2);
});

test('an email is attached only once its code comes back, in the account language', function () {
    $player = $this->signIn(User::factory()->locale('ar')->create());

    $this->postJson('/api/v1/me/credentials', ['email' => 'Kubi@Example.com', 'password' => 'long-enough'])
        ->assertStatus(202)
        ->assertJsonPath('email', 'kubi@example.com');
    expect($player->fresh()->email)->toBeNull();
    Mail::assertSent(EmailCodeMail::class, fn (EmailCodeMail $mail) => $mail->purpose === EmailCodePurpose::Link && $mail->locale === 'ar');
    $code = $this->codeSentTo('kubi@example.com');

    $this->assertApiError($this->postJson('/api/v1/me/credentials/verify', ['code' => $code === '000000' ? '111111' : '000000']), 422, 'code_invalid');
    $this->postJson('/api/v1/me/credentials/verify', ['code' => $code])
        ->assertOk()
        ->assertJsonPath('user.email', 'kubi@example.com')
        ->assertJsonPath('user.isGuest', false);

    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'long-enough'])
        ->assertOk()
        ->assertJsonPath('user.id', $player->id);
});

test('an email to attach gets a new code after a minute, and none without one waiting', function () {
    $this->signIn(User::factory()->create());
    $this->assertApiError($this->postJson('/api/v1/me/credentials/resend'), 422, 'code_expired');
    $this->assertApiError($this->postJson('/api/v1/me/credentials/verify', ['code' => '123456']), 422, 'code_expired');

    $this->postJson('/api/v1/me/credentials', ['email' => 'kubi@example.com', 'password' => 'long-enough'])->assertStatus(202);
    $this->postJson('/api/v1/me/credentials/resend')->assertStatus(202)->assertJsonPath('email', 'kubi@example.com');
    Mail::assertSentCount(1);
    $this->travel(61)->seconds();
    $this->postJson('/api/v1/me/credentials/resend')->assertStatus(202)->assertJsonPath('resendIn', 60);
    Mail::assertSentCount(2);
});

test('an email another account took before the code came back is refused', function () {
    $this->signIn(User::factory()->create());
    $this->postJson('/api/v1/me/credentials', ['email' => 'kubi@example.com', 'password' => 'long-enough'])->assertStatus(202);
    $code = $this->codeSentTo('kubi@example.com');
    User::factory()->linked('kubi@example.com')->create();

    $this->assertApiError($this->postJson('/api/v1/me/credentials/verify', ['code' => $code]), 409, 'email_taken');
});

test('deleting an account deletes the codes it was waiting on', function () {
    $player = $this->signIn(User::factory()->create());
    $this->postJson('/api/v1/me/credentials', ['email' => 'kubi@example.com', 'password' => 'long-enough'])->assertStatus(202);

    $this->deleteJson('/api/v1/me')->assertNoContent();

    $this->assertSame(0, EmailCode::query()->where('user_id', $player->id)->count());
});
