/**
 * Where the admin panel finds the API in each environment. Every value here
 * ships in the bundle and is public — nothing secret belongs in this file or
 * in any `VITE_*` variable.
 *
 * Local development talks to `/api` on its own origin, which the Vite dev
 * server proxies to `php artisan serve` on :8000 — no CORS in the way.
 */

/** @typedef {'local' | 'staging' | 'production'} Environment */

/** @type {Readonly<Record<Environment, { apiOrigin: string; adminOrigin: string }>>} */
export const ENVIRONMENTS = Object.freeze({
  local: { apiOrigin: '', adminOrigin: 'http://localhost:5180' },
  staging: {
    apiOrigin: 'https://staging-api.quezby.com',
    adminOrigin: 'https://staging-admin.quezby.com',
  },
  production: {
    apiOrigin: 'https://api.quezby.com',
    adminOrigin: 'https://admin.quezby.com',
  },
});

/**
 * The environment a Vite mode builds for: `vite` and the tests are local,
 * `vite build` is production unless `--mode staging` says otherwise.
 *
 * @param {string} mode
 * @returns {Environment}
 */
export function environmentFor(mode) {
  if (mode === 'staging' || mode === 'production') return mode;
  return 'local';
}

/**
 * The API origin a build talks to — `VITE_API_ORIGIN` wins, so a local panel
 * can be pointed at staging for a look.
 *
 * @param {string} mode
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function apiOriginFor(mode, env = {}) {
  const override = env.VITE_API_ORIGIN?.trim();
  if (override) return override.replace(/\/$/, '');
  return ENVIRONMENTS[environmentFor(mode)].apiOrigin;
}
