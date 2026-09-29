<?php

/*
| The `message` of every error code — see `lang/tr/errors.php`. A no-break
| space (U+00A0) goes before `! ? : ; %`.
*/

return [
    'validation_failed' => 'Il y a un problème avec les informations envoyées.',
    'unauthenticated' => 'Ta session a expiré. Reconnecte-toi.',
    'not_found' => 'Ce que tu cherches est introuvable.',
    'username_invalid' => "Ce pseudo n'est pas valide.",
    'username_taken' => 'Ce pseudo est déjà pris.',
    'username_locked' => "Tu as déjà choisi ton pseudo\u{00A0}; un nom choisi ne change plus.",
    'invalid_credentials' => 'E-mail ou mot de passe incorrect.',
    'email_taken' => 'Cet e-mail est déjà lié à un autre compte.',
    'already_linked' => 'Déjà lié à ce compte.',
    'identity_invalid' => 'Impossible de vérifier la connexion. Réessaie.',
    'identity_taken' => 'Ce compte appartient à un autre joueur Quezby.',
    'last_sign_in_method' => "C'est ton seul moyen d'accéder à ton compte. Lie d'abord un autre moyen.",
    'run_already_finished' => 'Cette partie est déjà terminée.',
    'run_expired' => 'Le temps de cette partie est écoulé.',
    'run_rejected' => "Cette partie n'a pas pu être vérifiée, elle n'entre pas au classement.",
    'engine_outdated' => "Ta version du jeu n'est plus à jour. Mets l'app à jour pour entrer au classement.",
    'daily_already_played' => "Tu as déjà joué le Fil du jour. Un nouveau t'attend demain.",
    'rated_locked' => "Le mode classé n'est pas encore ouvert. Joue d'abord des parties normales ou quotidiennes.",
    'cannot_befriend_self' => "Tu ne peux pas t'envoyer une demande d'ami.",
    'friend_limit' => 'Tu peux avoir :limit amis au maximum.',
    'request_limit' => "Tu peux avoir :limit demandes en attente au maximum. Envoie-en une nouvelle quand quelqu'un répond.",
    'not_friends' => "Tu ne peux faire ça qu'avec un ami.",
    'friends_hidden' => 'Seuls ses amis peuvent voir cette liste.',
    'message_limit' => 'Tu peux envoyer :limit messages par jour au maximum à cet ami.',
    'duel_unavailable' => 'Ce VS ne peut plus être joué.',
    'duel_limit' => 'Tu peux avoir :limit VS en attente au maximum.',
    'photo_invalid' => "Impossible d'utiliser cette photo. Choisis-en une autre.",
    'challenge_invalid' => "La vérification de l'appareil a expiré ou n'est pas valide. Réessaie.",
    'integrity_invalid' => "Impossible de lire la vérification de l'appareil. Réessaie.",
    'attest_key_unknown' => "La clé de cet appareil n'est pas reconnue. Vérifie à nouveau l'appareil.",
    'too_many_requests' => 'Tu as envoyé trop de requêtes. Attends un peu et réessaie.',
    'forbidden' => "Tu n'as pas l'autorisation de faire ça.",
    'server_error' => 'Un problème est survenu. Réessaie dans un instant.',

    'maintenance' => 'Une maintenance est en cours. Réessaie dans un instant.',
];
