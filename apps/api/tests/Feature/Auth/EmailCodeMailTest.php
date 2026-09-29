<?php

use App\Enums\EmailCodePurpose;
use App\Mail\EmailCodeMail;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;

/*
| What the email says, as it really goes out (the `array` mailer): the code
| in the subject and the body, in the language of the sign-up.
*/

/** The email the array mailer took last. */
function lastEmail(): Email
{
    $sent = Mail::mailer()->getSymfonyTransport()->messages()->last();
    expect($sent)->not->toBeNull();

    return $sent->getOriginalMessage();
}

test('a sign-up code goes out in the language of the sign-up', function () {
    $this->withHeader('Accept-Language', 'de')
        ->postJson('/api/v1/auth/register', ['email' => 'kubi@example.com', 'password' => 'secret-password', 'platform' => 'ios', 'installId' => 'i'])
        ->assertStatus(202);

    $email = lastEmail();
    expect($email->getSubject())->toMatch('/^Dein Quezby-Code: \d{6}$/')
        ->and($email->getHtmlBody())->toContain('Bestätige deine E-Mail')
        ->and($email->getHtmlBody())->toContain('Der Code gilt 15 Minuten.')
        ->and($email->getTextBody())->toContain('Gib diesen Code in der App ein, um dein Quezby-Konto zu eröffnen.')
        ->and($email->getTo()[0]->getAddress())->toBe('kubi@example.com');
    preg_match('/(\d{6})$/', $email->getSubject(), $code);
    expect($email->getHtmlBody())->toContain($code[1]);
});

test('each purpose has its own words, in every language', function (string $locale, string $subject, string $reset) {
    $mail = (new EmailCodeMail(EmailCodePurpose::Reset, '012345', 15))->locale($locale);
    $html = $mail->render();

    expect($html)->toContain('012345')->toContain($reset);
    $this->app->setLocale($locale);
    expect($mail->envelope()->subject)->toBe($subject);
})->with([
    ['tr', 'Quezby kodun: 012345', 'Şifreni yenile'],
    ['en', 'Your Quezby code: 012345', 'Reset your password'],
    ['de', 'Dein Quezby-Code: 012345', 'Setz dein Passwort zurück'],
    ['ar', 'رمز Quezby الخاص بك: 012345', 'أعد تعيين كلمة المرور'],
    ['fr', "Ton code Quezby\u{00A0}: 012345", 'Réinitialise ton mot de passe'],
    ['es', 'Tu código de Quezby: 012345', 'Restablece tu contraseña'],
]);

test('Arabic reads right to left, the code left to right', function () {
    $html = (new EmailCodeMail(EmailCodePurpose::Signup, '012345', 15))->locale('ar')->render();

    expect($html)->toContain('dir="rtl"')->toContain('lang="ar"')->toContain('<div dir="ltr" style="font-size:40px');
});
