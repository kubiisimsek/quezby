<?php

namespace App\Services\Push;

use App\Enums\Locale;
use App\Enums\MessageKind;
use App\Models\Duel;
use App\Models\Message;
use App\Models\PushToken;
use App\Models\User;
use App\Services\Google\ServiceAccountToken;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Tells a player's phones what happened while they were away — a friend
 * request, a request accepted, a VS sent to them, the result of one they
 * sent, a phrase — through Firebase Cloud Messaging, in their own language,
 * once the response has gone (no queue, no cron). A player chooses which
 * kinds (`settings.pushFriends|pushVs|pushMessages`); a banned player's
 * doings push nothing; phrases push at most once every
 * `inbox.push_gap_seconds` from one friend, the rest wait in the inbox. A VS
 * turned down or run out only lands in the inbox. A token Firebase no longer
 * knows is dropped.
 */
final class PushService
{
    public const SEND_URL = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';

    public const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    private readonly ServiceAccountToken $token;

    public function __construct(
        #[Config('quezby.push.enabled')]
        private readonly bool $enabled,
        #[Config('quezby.push.project_id')]
        private readonly ?string $projectId,
        #[Config('quezby.push.credentials')]
        ?string $credentials,
        #[Config('quezby.push.access_token_ttl_seconds')]
        int $ttlSeconds,
        #[Config('quezby.inbox.push_gap_seconds')]
        private readonly int $phraseGap,
    ) {
        $this->token = new ServiceAccountToken($credentials, self::SCOPE, $ttlSeconds, 'fcm', 'FIREBASE_CREDENTIALS');
    }

    /** Whether pushes can go out at all: switched on, a project and a readable key. */
    public function isConfigured(): bool
    {
        return $this->enabled && (string) $this->projectId !== '' && $this->token->isConfigured();
    }

    /** A friend request waiting for `$to`. */
    public function friendRequest(User $from, User $to): void
    {
        $this->notify($to, 'pushFriends', 'friend_request', ['name' => $this->handle($from)], ['kind' => 'friend_request', 'username' => (string) $from->username]);
    }

    /** A new line between two friends. */
    public function aboutMessage(Message $message, User $from, User $to): void
    {
        if ($from->isBanned()) {
            return;
        }
        $data = ['kind' => $message->kind->value, 'username' => (string) $from->username];
        $name = ['name' => $this->handle($from)];

        match ($message->kind) {
            MessageKind::Friends => $this->notify($to, 'pushFriends', 'friend_accepted', $name, $data),
            MessageKind::VsInvite => $this->notify($to, 'pushVs', 'vs_invite', $name, $data + ['duelId' => (string) $message->duel_id]),
            MessageKind::VsResult => $message->duel === null ? null : $this->result($message->duel, $to, $name, $data),
            MessageKind::Phrase => $message->phrase !== null && Cache::add("push:phrase:{$from->id}:{$to->id}", true, $this->phraseGap)
                ? $this->notify($to, 'pushMessages', 'phrase', $name, $data, phrase: 'phrases.'.$message->phrase->value)
                : null,
            default => null,
        };
    }

    /**
     * Sends one push to every phone of `$to` who wants this kind, after the
     * response.
     *
     * @param  array<string, string>  $replace
     * @param  array<string, string>  $data
     */
    private function notify(User $to, string $setting, string $line, array $replace, array $data, ?string $phrase = null): void
    {
        if (! $this->enabled || ! ($to->resolvedSettings()[$setting] ?? true) || $to->isBanned()) {
            return;
        }
        $tokens = $to->pushTokens()->get();
        if ($tokens->isEmpty()) {
            return;
        }

        $locale = $to->locale instanceof Locale ? $to->locale->value : 'tr';
        if ($phrase !== null) {
            $replace['phrase'] = __($phrase, [], $locale);
        }
        $body = __('push.'.$line, $replace, $locale);
        $thread = 'friend-'.($data['username'] ?? 'quezby');

        defer(fn () => $this->send($tokens, __('push.title', [], $locale), $body, $data, $thread));
    }

    /**
     * @param  array<string, string>  $name
     * @param  array<string, string>  $data
     */
    private function result(Duel $duel, User $to, array $name, array $data): void
    {
        $mine = $duel->challenger_id === $to->id;
        $locale = $to->locale instanceof Locale ? $to->locale : Locale::Tr;
        $score = fn (?int $points) => $points === null ? '—' : $locale->group($points);
        $line = match ($duel->winner_id) {
            null => 'vs_draw',
            $to->id => 'vs_won',
            default => 'vs_lost',
        };

        $this->notify($to, 'pushVs', $line, $name + [
            'you' => $score($mine ? $duel->challenger_score : $duel->opponent_score),
            'them' => $score($mine ? $duel->opponent_score : $duel->challenger_score),
        ], $data + ['duelId' => $duel->id]);
    }

    /**
     * @param  Collection<int, PushToken>  $tokens
     * @param  array<string, string>  $data
     */
    public function send(Collection $tokens, string $title, string $body, array $data, string $thread): void
    {
        if (! $this->isConfigured()) {
            return;
        }
        $access = $this->token->accessToken();
        if ($access === null) {
            return;
        }

        foreach ($tokens as $token) {
            try {
                $response = Http::withToken($access)->acceptJson()->timeout(5)->post(sprintf(self::SEND_URL, $this->projectId), [
                    'message' => [
                        'token' => $token->token,
                        'notification' => ['title' => $title, 'body' => $body],
                        'data' => $data,
                        'android' => ['priority' => 'high', 'notification' => ['channel_id' => 'social', 'tag' => $thread]],
                        'apns' => [
                            'headers' => ['apns-priority' => '10'],
                            'payload' => ['aps' => ['sound' => 'default', 'thread-id' => $thread]],
                        ],
                    ],
                ]);
            } catch (Throwable $e) {
                Log::warning('A push could not be sent.', ['reason' => $e->getMessage()]);

                continue;
            }

            if ($response->status() === 401) {
                $this->token->forget();
            }
            if ($this->gone($response->status(), (array) $response->json('error'))) {
                $token->delete();
            } elseif (! $response->successful()) {
                Log::warning('Firebase refused a push.', ['status' => $response->status(), 'error' => $response->json('error.status')]);
            }
        }
    }

    /**
     * Whether Firebase says the token will never work again: the app was
     * uninstalled, or the token is not one at all.
     *
     * @param  array<string, mixed>  $error
     */
    private function gone(int $status, array $error): bool
    {
        if ($status === 404) {
            return true;
        }
        foreach ((array) ($error['details'] ?? []) as $detail) {
            if (($detail['errorCode'] ?? null) === 'UNREGISTERED') {
                return true;
            }
            foreach ((array) ($detail['fieldViolations'] ?? []) as $violation) {
                if (($violation['field'] ?? null) === 'message.token') {
                    return true;
                }
            }
        }

        return false;
    }

    private function handle(User $user): string
    {
        return '@'.$user->username;
    }
}
