<?php

/*
| The root every App Attest chain must end in: Apple's App Attestation Root
| CA, committed in `resources/certs` and pinned by config.
*/

it('pins the App Attestation Root CA Apple publishes', function () {
    expect(config('quezby.integrity.ios.root_ca'))->toBe('resources/certs/apple-app-attestation-root-ca.pem');

    $pinned = openssl_x509_parse((string) file_get_contents(base_path(config('quezby.integrity.ios.root_ca'))));

    expect($pinned['subject'])->toMatchArray(['CN' => 'Apple App Attestation Root CA', 'O' => 'Apple Inc.'])
        ->and($pinned['issuer'])->toBe($pinned['subject'])
        ->and(strtoupper($pinned['serialNumberHex']))->toBe('0BF3BE0EF1CDD2E0FB8C6E721F621798')
        ->and(gmdate('Y-m-d', $pinned['validTo_time_t']))->toBe('2045-03-15');
});
