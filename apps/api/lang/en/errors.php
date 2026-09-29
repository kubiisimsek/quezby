<?php

/*
| The `message` of every error code — see `lang/tr/errors.php`.
*/

return [
    'validation_failed' => "Something's wrong with what was sent.",
    'unauthenticated' => 'Your session has expired. Sign in again.',
    'not_found' => "Couldn't find what you were looking for.",
    'username_invalid' => "This username isn't valid.",
    'username_taken' => 'This username is taken.',
    'username_locked' => "You've already picked your username; a picked name never changes.",
    'invalid_credentials' => 'Wrong email or password.',
    'email_taken' => 'This email belongs to another account.',
    'email_unverified' => "You haven't verified your email yet. We sent the code to your email.",
    'code_invalid' => 'Wrong code. Try again.',
    'code_expired' => 'This code has expired. Ask for a new one.',
    'already_linked' => 'Already linked to this account.',
    'identity_invalid' => "Couldn't verify the sign-in. Try again.",
    'identity_taken' => 'This account belongs to another Quezby player.',
    'last_sign_in_method' => 'This is the only way into your account. Link another one first.',
    'run_already_finished' => 'This game has already finished.',
    'run_expired' => 'This game has expired.',
    'run_rejected' => "This game couldn't be verified, so it can't rank.",
    'engine_outdated' => 'Your version of the game is out of date. Update the app to rank.',
    'daily_already_played' => "You've played today's Daily Feed. A new one is waiting tomorrow.",
    'rated_locked' => "Ranked isn't open yet. Play Normal or Daily games first.",
    'cannot_befriend_self' => "You can't send yourself a friend request.",
    'friend_limit' => 'You can have up to :limit friends.',
    'request_limit' => 'You can have up to :limit requests waiting for an answer. Send a new one once someone answers.',
    'not_friends' => 'You can only do this with a friend.',
    'friends_hidden' => 'Only their friends can see this list.',
    'message_limit' => 'You can send this friend up to :limit messages a day.',
    'duel_unavailable' => "This VS can't be played any more.",
    'duel_limit' => 'You can have up to :limit VS waiting for an answer.',
    'photo_invalid' => "This photo couldn't be used. Pick another one.",
    'challenge_invalid' => 'The device check expired or was invalid. Try again.',
    'integrity_invalid' => "Couldn't read the device check. Try again.",
    'attest_key_unknown' => "This device's key isn't recognized. Verify the device again.",
    'too_many_requests' => "You've sent too many requests. Wait a bit and try again.",
    'forbidden' => "You're not allowed to do that.",
    'server_error' => 'Something went wrong. Try again in a moment.',

    'maintenance' => "We're doing some maintenance. Try again in a moment.",
];
