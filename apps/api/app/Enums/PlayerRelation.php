<?php

namespace App\Enums;

/**
 * What another player is to the one asking — `PlayerRelation` in
 * `packages/types`. `requested`: the asker's request waits for them;
 * `incoming`: theirs waits for the asker; `blocked`: the asker blocked them.
 * Nobody is ever told that they were blocked: to them the blocker is gone.
 */
enum PlayerRelation: string
{
    case None = 'none';
    case Friend = 'friend';
    case Requested = 'requested';
    case Incoming = 'incoming';
    case Blocked = 'blocked';
}
