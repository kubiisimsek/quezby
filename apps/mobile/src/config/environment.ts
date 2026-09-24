/**
 * Which API this build talks to. There is one app — one bundle id, one
 * install — and `QUEZBY_ENV` in `apps/mobile/.env` names the environment:
 * `pnpm switch-local`, `switch-staging` or `switch-production` set it
 * (`docs/development/environments.md`).
 */
export type AppEnvironment = 'local' | 'staging' | 'production';

const ENVIRONMENTS: readonly AppEnvironment[] = ['local', 'staging', 'production'];

/**
 * `QUEZBY_ENV` as `.env` gives it. Anything else — nothing, a typo — is the
 * local environment, so a build never reaches production by accident.
 */
export function environmentFrom(raw: string | null | undefined): AppEnvironment {
  const name = (raw ?? '').trim();
  return ENVIRONMENTS.find((environment) => environment === name) ?? 'local';
}

/** `http://192.168.1.20:8081/index.bundle?…` → `192.168.1.20`. */
export function hostOfScriptUrl(scriptUrl: string | null | undefined): string | null {
  if (!scriptUrl) return null;
  const match = scriptUrl.match(/^[a-z]+:\/\/([^/:?#]+)/i);
  return match?.[1] ?? null;
}

/**
 * A local build on a phone cannot reach `localhost` — that is the phone. When
 * Metro served the bundle from the Mac, the API is on the same host.
 */
export function localApiUrl(
  configured: string,
  metroHost: string | null,
  platform: 'ios' | 'android',
): string {
  const url = configured.replace(/\/$/, '');
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
  if (!isLoopback) return url;
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return url.replace(/(localhost|127\.0\.0\.1)/, metroHost);
  }
  return platform === 'android'
    ? url.replace(/(localhost|127\.0\.0\.1)/, '10.0.2.2')
    : url;
}

/** A Google Cloud project number as `.env` gives it — digits only — or null. */
export function cloudProjectNumber(raw: string | null | undefined): string | null {
  const number = (raw ?? '').trim();
  return /^\d+$/.test(number) ? number : null;
}
