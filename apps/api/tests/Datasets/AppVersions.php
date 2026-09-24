<?php

/*
| A platform, the version the app reports and the status it should get,
| against the releases AppConfigTest configures: iOS at minimum 1.2.0 and
| latest 1.4.0, Android at 1.0.0 for both.
*/

dataset('app versions', [
    'below the minimum' => ['ios', '1.1.9', 'update_required'],
    'below the latest' => ['ios', '1.2.0', 'update_available'],
    'shorter but lower' => ['ios', '1.3', 'update_available'],
    'the latest' => ['ios', '1.4.0', 'ok'],
    'newer than the latest' => ['ios', '1.10.0', 'ok'],
    'unparseable' => ['ios', 'banana', 'ok'],
    'a pre-release suffix' => ['ios', '0.1.0-beta', 'ok'],
    'missing' => ['ios', null, 'ok'],
    'another platform' => ['android', '1.0.0', 'ok'],
]);
