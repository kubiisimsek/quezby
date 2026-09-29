<?php

/*
| The `message` of every error code (`App\Enums\ErrorCode`, `ApiErrorCode`
| in `packages/types`), in the request's language. The app shows its own
| line per code (`messageFor`) and this one only for `validation_failed`;
| the admin panel shows these, in Turkish.
*/

return [
    'validation_failed' => 'Gönderilen bilgilerde bir sorun var.',
    'unauthenticated' => 'Oturumun geçersiz, lütfen yeniden giriş yap.',
    'not_found' => 'Aradığın şey bulunamadı.',
    'username_invalid' => 'Bu kullanıcı adı geçersiz.',
    'username_taken' => 'Bu kullanıcı adı alınmış.',
    'username_locked' => 'Kullanıcı adını zaten seçtin; seçilen ad değişmez.',
    'invalid_credentials' => 'E-posta ya da şifre hatalı.',
    'email_taken' => 'Bu e-posta başka bir hesaba bağlı.',
    'already_linked' => 'Bu hesaba zaten bağlı.',
    'identity_invalid' => 'Giriş doğrulanamadı, lütfen tekrar dene.',
    'identity_taken' => 'Bu hesap başka bir Quezby oyuncusuna bağlı.',
    'last_sign_in_method' => 'Bu, hesabına girmenin tek yolu. Önce başka bir yol bağla.',
    'run_already_finished' => 'Bu oyun zaten bitirilmiş.',
    'run_expired' => 'Bu oyunun süresi doldu.',
    'run_rejected' => 'Bu oyun doğrulanamadı, sıralamaya giremez.',
    'engine_outdated' => 'Oyun sürümün güncel değil, sıralamaya girmek için uygulamayı güncelle.',
    'daily_already_played' => 'Günün akışını bugün oynadın. Yarın yeni akış seni bekliyor.',
    'rated_locked' => 'Dereceli henüz açılmadı. Önce Normal ya da Günlük oyunlarını oyna.',
    'cannot_befriend_self' => 'Kendine arkadaşlık isteği gönderemezsin.',
    'friend_limit' => 'En fazla :limit arkadaşın olabilir.',
    'request_limit' => 'Cevap bekleyen en fazla :limit isteğin olabilir. Biri cevap verince yenisini gönder.',
    'not_friends' => 'Bunu yalnızca bir arkadaşınla yapabilirsin.',
    'friends_hidden' => 'Bu listeyi yalnızca arkadaşları görebilir.',
    'message_limit' => 'Bu arkadaşına bugün en fazla :limit mesaj gönderebilirsin.',
    'duel_unavailable' => 'Bu VS artık oynanamıyor.',
    'duel_limit' => 'Cevap bekleyen en fazla :limit VS\'in olabilir.',
    'photo_invalid' => 'Bu fotoğraf kullanılamadı. Başka bir fotoğraf seç.',
    'challenge_invalid' => 'Cihaz doğrulama isteği geçersiz ya da süresi dolmuş, tekrar dene.',
    'integrity_invalid' => 'Cihaz doğrulaması okunamadı, tekrar dene.',
    'attest_key_unknown' => 'Bu cihazın anahtarı tanınmıyor, cihazı yeniden doğrula.',
    'too_many_requests' => 'Çok fazla istek gönderdin, biraz bekleyip tekrar dene.',
    'forbidden' => 'Bu işlem için yetkin yok.',
    'server_error' => 'Bir şeyler ters gitti, birazdan tekrar dene.',

    // A 503 while the API is down for maintenance (`server_error`).
    'maintenance' => 'Bakım çalışması var, birazdan tekrar dene.',
];
