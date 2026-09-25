<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;

/*
| The admin contract's closed lists are one list on each side: the PHP enums
| and the unions in `packages/types/src/admin.ts`.
*/

/**
 * The string members of `export type {$name} = …;` in the admin contract.
 *
 * @return list<string>
 */
function adminContractUnion(string $name): array
{
    $types = (string) file_get_contents(dirname(__DIR__, 4).'/packages/types/src/admin.ts');
    preg_match('/export type '.$name.' =(.*?);/s', $types, $union);
    preg_match_all("/'([a-z_.-]+)'/", $union[1] ?? '', $members);

    return collect($members[1])->sort()->values()->all();
}

/**
 * @param  class-string<BackedEnum>  $enum
 * @return list<string>
 */
function adminContractCases(string $enum): array
{
    return collect($enum::cases())->map(fn (BackedEnum $case) => (string) $case->value)->sort()->values()->all();
}

it('names the same admin roles', function () {
    expect(adminContractUnion('AdminRole'))->not->toBeEmpty()->toBe(adminContractCases(AdminRole::class));
});

it('names the same audit actions', function () {
    expect(adminContractUnion('AdminAuditAction'))->not->toBeEmpty()->toBe(adminContractCases(AuditAction::class));
});

it('names the same audit channels', function () {
    expect(adminContractUnion('AdminAuditVia'))->not->toBeEmpty()->toBe(adminContractCases(AuditVia::class));
});
