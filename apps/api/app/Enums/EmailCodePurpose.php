<?php

namespace App\Enums;

/** What an emailed code proves (`EmailCodes`). */
enum EmailCodePurpose: string
{
    /** A new account's email, before the account exists. */
    case Signup = 'signup';
    /** An email a signed-in player attaches to their account. */
    case Link = 'link';
    /** A forgotten password. */
    case Reset = 'reset';
}
