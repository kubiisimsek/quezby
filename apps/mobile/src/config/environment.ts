/**
 * Which of the three apps this is — decided by the native build, never by
 * `.env`: the bundle id is `….local`, `….staging` or the bare production id
 * (`docs/development/environments.md`). One JS bundle, three installs.
 */
export type AppEnvironment = 'local' | 'staging' | 'production';

export function environmentFromBundleId(bundleId: string): AppEnvironment {
  if (bundleId.endsWith('.local')) return 'local';
  if (bundleId.endsWith('.staging')) return 'staging';
  return 'production';
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
