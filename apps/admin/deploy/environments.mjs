/**
 * Where the admin panel lives and finds the API in each environment. Every
 * value here ships in the bundle and is public — nothing secret belongs in
 * this file or in any `VITE_*` variable.
 *
 * Local development talks to `/api` on its own origin, which the Vite dev
 * server proxies to `php artisan serve` on :8000 — no CORS in the way.
 *
 * Production shares one origin: the panel at quezby.com/panel, the API at
 * quezby.com/api (docs/deployment/shared-hosting.md). `adminBase` is the path
 * the panel is served under — Vite's `base` and the router's basename.
 */

/** @typedef {'local' | 'staging' | 'production'} Environment */

/** @type {Readonly<Record<Environment, { apiOrigin: string; adminOrigin: string; adminBase: string }>>} */
export const ENVIRONMENTS = Object.freeze({
  local: { apiOrigin: '', adminOrigin: 'http://localhost:5180', adminBase: '/' },
  staging: {
    apiOrigin: 'https://quezby.kubisimsek.com',
    adminOrigin: 'https://quezby-admin.kubisimsek.com',
    adminBase: '/',
  },
  production: {
    apiOrigin: 'https://quezby.com',
    adminOrigin: 'https://quezby.com',
    adminBase: '/panel/',
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

/**
 * The path a build is served under: `/panel/` in production, `/` elsewhere.
 *
 * @param {string} mode
 * @returns {string}
 */
export function adminBaseFor(mode) {
  return ENVIRONMENTS[environmentFor(mode)].adminBase;
}
