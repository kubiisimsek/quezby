<?php

/*
| The `message` of every error code — see `lang/tr/errors.php`.
*/

return [
    'validation_failed' => '送信された内容に問題があります。',
    'unauthenticated' => 'ログインの有効期限が切れました。もう一度ログインしてください。',
    'not_found' => 'お探しのものが見つかりませんでした。',
    'username_invalid' => 'このユーザー名は無効です。',
    'username_taken' => 'このユーザー名はすでに使われています。',
    'username_locked' => 'ユーザー名はもう決まっています。一度決めた名前は変えられません。',
    'invalid_credentials' => 'メールアドレスまたはパスワードが違います。',
    'email_taken' => 'このメールアドレスは別のアカウントで使われています。',
    'email_unverified' => 'メールアドレスがまだ確認されていません。確認コードをメールで送りました。',
    'code_invalid' => 'コードが違います。もう一度お試しください。',
    'code_expired' => 'コードの有効期限が切れました。新しいコードをリクエストしてください。',
    'already_linked' => 'すでにこのアカウントに連携されています。',
    'identity_invalid' => 'ログインを確認できませんでした。もう一度お試しください。',
    'identity_taken' => 'このアカウントは別のQuezbyプレイヤーに連携されています。',
    'last_sign_in_method' => 'これはアカウントに入る唯一の方法です。先に別の方法を連携してください。',
    'run_already_finished' => 'このゲームはすでに終了しています。',
    'run_expired' => 'このゲームの有効期限が切れました。',
    'run_rejected' => 'このゲームは確認できなかったため、ランキングに入りません。',
    'engine_outdated' => 'ゲームのバージョンが古いです。ランキングに入るにはアプリをアップデートしてください。',
    'daily_already_played' => '今日のフィードはもうプレイしました。明日また新しいフィードが待っています。',
    'rated_locked' => 'ランク戦はまだ開放されていません。まずノーマルかデイリーをプレイしてください。',
    'cannot_befriend_self' => '自分にフレンド申請は送れません。',
    'friend_limit' => 'フレンドは最大:limit人までです。',
    'request_limit' => '返事待ちの申請は最大:limit件までです。誰かが返事をしたら、新しい申請を送ってください。',
    'not_friends' => 'この操作はフレンドとだけできます。',
    'friends_hidden' => 'このリストはフレンドだけが見られます。',
    'message_limit' => 'このフレンドに送れるメッセージは1日:limit件までです。',
    'duel_unavailable' => 'このVSはもうプレイできません。',
    'duel_limit' => '返事待ちのVSは最大:limit件までです。',
    'photo_invalid' => 'この写真は使えませんでした。別の写真を選んでください。',
    'challenge_invalid' => '端末の確認リクエストが無効か、期限切れです。もう一度お試しください。',
    'integrity_invalid' => '端末の確認を読み取れませんでした。もう一度お試しください。',
    'attest_key_unknown' => 'この端末のキーが認識されません。端末をもう一度確認してください。',
    'too_many_requests' => 'リクエストが多すぎます。少し待ってからもう一度お試しください。',
    'forbidden' => 'この操作を行う権限がありません。',
    'server_error' => '問題が発生しました。しばらくしてからもう一度お試しください。',

    'maintenance' => 'メンテナンス中です。しばらくしてからもう一度お試しください。',
];
