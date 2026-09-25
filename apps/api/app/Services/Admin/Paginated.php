<?php

namespace App\Services\Admin;

use Closure;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/** `AdminPage` in `packages/types`: a page of rows and where it sits among all of them. */
final class Paginated
{
    /**
     * @template TItem
     *
     * @param  LengthAwarePaginator<int, TItem>  $page
     * @param  Closure(TItem): array<string, mixed>  $present
     * @return array{items: list<array<string, mixed>>, page: int, perPage: int, total: int}
     */
    public static function of(LengthAwarePaginator $page, Closure $present): array
    {
        return [
            'items' => array_values(array_map($present, $page->items())),
            'page' => $page->currentPage(),
            'perPage' => $page->perPage(),
            'total' => $page->total(),
        ];
    }

    /** A LIKE pattern for text an admin typed: `%` and `_` mean themselves, escaped with `!`. */
    public static function prefix(string $text): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $text).'%';
    }
}
