import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type Params = Record<string, string | undefined>;

/**
 * A list's filters and page, kept in the address bar so a filtered list can
 * be shared, reloaded and gone back to. `defaults` fills what the URL leaves
 * out (read once, on the first render); changing anything but the page goes
 * back to page one.
 */
export function useListParams<T extends Params>(defaults: T) {
  const [search, setSearch] = useSearchParams();
  const initial = useRef(defaults).current;

  const params = useMemo(() => {
    const values: Params = { ...initial };
    for (const key of Object.keys(initial)) {
      const value = search.get(key);
      if (value !== null && value !== '') values[key] = value;
    }
    return values as T;
  }, [search, initial]);

  const page = Math.max(1, Number.parseInt(search.get('page') ?? '1', 10) || 1);

  const set = useCallback(
    (changes: Partial<T>) => {
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || value === initial[key]) next.delete(key);
            else next.set(key, value);
          }
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearch, initial],
  );

  const setPage = useCallback(
    (value: number) => {
      setSearch((current) => {
        const next = new URLSearchParams(current);
        if (value <= 1) next.delete('page');
        else next.set('page', String(value));
        return next;
      });
    },
    [setSearch],
  );

  return { params, page, set, setPage };
}
