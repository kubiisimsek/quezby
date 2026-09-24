/**
 * The form `rules.lock.json` hashes: JSON with every object's keys sorted and
 * no whitespace. Plain data only — finite numbers, strings, booleans, null,
 * arrays and non-empty objects — so the PHP twin (`Rules::canonicalJson`)
 * writes the very same bytes. An empty object is refused: PHP cannot tell it
 * from an empty list once decoded.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`canonicalJson: ${value} is not finite`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length === 0) throw new Error('canonicalJson: empty objects have no PHP twin');
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new Error(`canonicalJson: cannot encode a ${typeof value}`);
}
