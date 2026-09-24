<?php

namespace App\Enums;

enum AppStatus: string
{
    case Ok = 'ok';
    case UpdateAvailable = 'update_available';
    case UpdateRequired = 'update_required';
}
