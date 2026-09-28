<?php

/*
| What a push says (`PushService`), in the receiver's language: a friend
| request, a request accepted, a VS sent, the result of one sent, a phrase
| (`phrases.php`). `:name` is the friend's handle, `:you` and `:them` the two
| scores grouped the language's way. Every Arabic line starts with a
| right-to-left mark, as the share texts do.
*/

return [
    'title' => 'Quezby',
    'friend_request' => ':name sana arkadaşlık isteği gönderdi.',
    'friend_accepted' => ':name arkadaşlık isteğini kabul etti. Hadi bir VS at!',
    'vs_invite' => ":name seni VS'e çağırdı! Onun skorunu, oynayınca görürsün.",
    'vs_won' => 'VS bitti, kazandın! :you – :them · :name',
    'vs_lost' => 'VS bitti, bu sefer :name kazandı. :you – :them',
    'vs_draw' => 'VS berabere bitti: :you – :them · :name',
    'phrase' => ':name: :phrase',
];
