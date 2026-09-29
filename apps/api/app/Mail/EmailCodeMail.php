<?php

namespace App\Mail;

use App\Enums\EmailCodePurpose;
use App\Enums\Locale;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The code, in the language it is sent in (`->locale()`: the one the player
 * signed up in). The subject carries the code, so a lock screen shows it.
 */
final class EmailCodeMail extends Mailable
{
    public function __construct(
        public readonly EmailCodePurpose $purpose,
        public readonly string $code,
        public readonly int $minutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('mail.subject', ['code' => $this->code]));
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.code',
            text: 'mail.code-text',
            with: [
                'title' => __('mail.title.'.$this->purpose->value),
                'line' => __('mail.line.'.$this->purpose->value),
                'expires' => __('mail.expires', ['minutes' => $this->minutes]),
                'ignore' => __('mail.ignore'),
                'rtl' => Locale::current()->isRtl(),
                'lang' => Locale::current()->value,
            ],
        );
    }
}
