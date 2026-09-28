<?php

namespace App\Enums;

/**
 * A line of the conversation between two friends — `MessageKind` in
 * `packages/types`. It goes from whoever made it happen to the other one,
 * who has it unread: the one who accepted a request, sent a phrase or a VS;
 * a VS's result, refusal or running out comes from the friend it was sent to.
 */
enum MessageKind: string
{
    case Friends = 'friends';
    case Phrase = 'phrase';
    case VsInvite = 'vs_invite';
    case VsResult = 'vs_result';
    case VsDeclined = 'vs_declined';
    case VsExpired = 'vs_expired';
}
