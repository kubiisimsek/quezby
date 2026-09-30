#!/usr/bin/env node
/**
 * One app — com.kubisimsek.game.quezby — and three environments it can talk to.
 *
 *   pnpm switch-local | pnpm switch-staging | pnpm switch-production
 *
 * Sets QUEZBY_ENV in apps/mobile/.env (made from .env.example when missing)
 * and writes apps/mobile/ios/Config/Environment.generated.xcconfig from it:
 * the app's name on the home screen and the iOS URL scheme Google sign-in
 * returns to. The JavaScript and the Android build read .env themselves.
 * Metro keys its cache on .env (apps/mobile/metro.config.js), so a restart is
 * all a running Metro needs.
 *
 *   node scripts/switch-env.mjs sync
 *
 * rewrites only the iOS settings from .env as it stands — `pnpm ios` runs it,
 * and an Xcode build stops when .env changed after the last one.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The files a switch reads and writes, relative to one mobile app. */
export function pathsFor(mobileDir) {
  return {
    env: join(mobileDir, '.env'),
    example: join(mobileDir, '.env.example'),
    xcconfig: join(mobileDir, 'ios/Config/Environment.generated.xcconfig'),
  };
}

export const BUNDLE_ID = 'com.kubisimsek.game.quezby';

export const ENVIRONMENTS = ['local', 'staging', 'production'];

/**
 * The name on the home screen, so a phone shows which API it talks to. The
 * Android build has the same three (apps/mobile/android/app/build.gradle).
 */
export const DISPLAY_NAMES = {
  local: 'Quezby Local',
  staging: 'Quezby Staging',
  production: 'Quezby',
};

/** Where each API is when .env does not say — as src/config/env.ts. */
const DEFAULT_API_URLS = {
  local: 'http://localhost:8000',
  staging: 'https://quezby.kubisimsek.com',
  production: 'https://quezby.com',
};

/** Info.plist needs some URL scheme until Google's is known; this one leads nowhere. */
export const PLACEHOLDER_URL_SCHEME = 'quezby-google';

/**
 * `KEY=value` lines as dotenv reads them: `#` starts a comment, quotes are
 * optional, and the last line for a key wins.
 */
export function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r\n|\n|\r/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;
    const raw = match[2];
    const quoted = raw.match(/^(["'`])(.*?)\1/);
    values.set(match[1], quoted ? quoted[2] : raw.split('#')[0].trim());
  }
  return values;
}

const ENV_LINE = /^\s*(?:export\s+)?QUEZBY_ENV\s*=/;

/**
 * The same file with `QUEZBY_ENV=<environment>`: the first such line is
 * rewritten and any later one dropped; without one, it goes first, below the
 * opening comments.
 */
export function withEnvironment(text, environment) {
  const line = `QUEZBY_ENV=${environment}`;
  if (text.trim() === '') return `${line}\n`;
  const lines = text.split('\n');
  const first = lines.findIndex((each) => ENV_LINE.test(each));
  if (first >= 0) {
    return lines
      .filter((each, index) => index === first || !ENV_LINE.test(each))
      .map((each) => (ENV_LINE.test(each) ? line : each))
      .join('\n');
  }
  const body = lines.findIndex(
    (each) => each.trim() !== '' && !each.trim().startsWith('#'),
  );
  lines.splice(body === -1 ? lines.length : body, 0, line, '');
  return lines.join('\n');
}

/**
 * The URL scheme iOS registers for Google sign-in: the iOS client id turned
 * around (`123-abc.apps.googleusercontent.com` →
 * `com.googleusercontent.apps.123-abc`). Null when it is not one.
 */
export function googleUrlScheme(clientId) {
  const match = (clientId ?? '')
    .trim()
    .match(/^([A-Za-z0-9-]+)\.apps\.googleusercontent\.com$/);
  return match ? `com.googleusercontent.apps.${match[1]}` : null;
}

/** The generated xcconfig for one environment and the values in .env. */
export function xcconfigFor(environment, values) {
  const scheme =
    googleUrlScheme(values.get('GOOGLE_IOS_CLIENT_ID')) ??
    PLACEHOLDER_URL_SCHEME;
  return [
    '// Written by scripts/switch-env.mjs from apps/mobile/.env — do not edit.',
    '// Run pnpm switch-local, switch-staging or switch-production instead.',
    `QUEZBY_ENV = ${environment}`,
    `QUEZBY_DISPLAY_NAME = ${DISPLAY_NAMES[environment]}`,
    `GOOGLE_IOS_URL_SCHEME = ${scheme}`,
    '',
  ].join('\n');
}

/** The API origin an environment's build talks to. */
export function apiUrlFor(environment, values) {
  const configured = values.get(`API_URL_${environment.toUpperCase()}`);
  return (configured || DEFAULT_API_URLS[environment]).replace(/\/$/, '');
}

/** Names .env.example has and .env does not. */
export function missingKeys(envText, exampleText) {
  const present = parseEnv(envText);
  return [...parseEnv(exampleText).keys()].filter((key) => !present.has(key));
}

/**
 * Points the app at one environment: .env (made from the example when
 * missing) and the iOS settings. Returns what the report needs.
 */
export function switchTo(environment, paths) {
  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `No environment "${environment}": ${ENVIRONMENTS.join(', ')}.`,
    );
  }
  const created = !existsSync(paths.env);
  if (created) copyFileSync(paths.example, paths.env);
  const before = readFileSync(paths.env, 'utf8');
  const after = withEnvironment(before, environment);
  if (after !== before) writeFileSync(paths.env, after);
  const values = parseEnv(after);
  writeFileSync(paths.xcconfig, xcconfigFor(environment, values));
  return {
    environment,
    created,
    values,
    missing: existsSync(paths.example)
      ? missingKeys(after, readFileSync(paths.example, 'utf8'))
      : [],
  };
}

/**
 * Rewrites the iOS settings from .env as it is. Without .env the app is the
 * local one; a QUEZBY_ENV nobody knows is an error.
 */
export function sync(paths) {
  const values = existsSync(paths.env)
    ? parseEnv(readFileSync(paths.env, 'utf8'))
    : new Map();
  const named = values.get('QUEZBY_ENV') || 'local';
  if (!ENVIRONMENTS.includes(named)) {
    throw new Error(
      `apps/mobile/.env: QUEZBY_ENV=${named} is none of ${ENVIRONMENTS.join(', ')}. ` +
        'Run pnpm switch-local, switch-staging or switch-production.',
    );
  }
  writeFileSync(paths.xcconfig, xcconfigFor(named, values));
  return named;
}

async function metroIsRunning() {
  try {
    const response = await fetch('http://localhost:8081/status', {
      signal: AbortSignal.timeout(400),
    });
    return (await response.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

async function report({ environment, created, values, missing }) {
  const googleOn =
    Boolean(values.get('GOOGLE_WEB_CLIENT_ID')) &&
    Boolean(values.get('GOOGLE_IOS_CLIENT_ID'));
  const project = values.get('GOOGLE_CLOUD_PROJECT_NUMBER');
  const lines = [
    `Quezby → ${environment}`,
    `  app       ${BUNDLE_ID}, "${DISPLAY_NAMES[environment]}" on the home screen`,
    `  API       ${apiUrlFor(environment, values)}`,
    `  Google    ${googleOn ? 'sign-in on' : 'sign-in off (GOOGLE_WEB_CLIENT_ID / GOOGLE_IOS_CLIENT_ID empty)'}`,
    `  Android   ${project ? `device check on (Cloud project ${project})` : 'device check off (GOOGLE_CLOUD_PROJECT_NUMBER empty)'}`,
  ];
  if (created) lines.push('', 'Made apps/mobile/.env from .env.example.');
  if (missing.length > 0) {
    lines.push(
      '',
      `apps/mobile/.env has no ${missing.join(', ')} — copy them from .env.example.`,
    );
  }
  if (values.get('GOOGLE_IOS_CLIENT_ID') && !googleUrlScheme(values.get('GOOGLE_IOS_CLIENT_ID'))) {
    lines.push(
      '',
      'GOOGLE_IOS_CLIENT_ID is not an iOS client id (….apps.googleusercontent.com); iOS gets no URL scheme for it.',
    );
  }
  if (environment === 'production') {
    lines.push(
      '',
      'Production: a Debug build proves itself in App Attest’s development environment and',
      'is not from Google Play, so with QUEZBY_INTEGRITY_MODE=enforce its runs never rank.',
      'Ranked play on production is for TestFlight / App Store and Play builds.',
    );
  }
  lines.push(
    '',
    (await metroIsRunning())
      ? 'Metro is running: stop it and start it again (pnpm start) so the bundle picks this up.'
      : 'Next: pnpm ios / pnpm android.',
  );
  console.log(lines.join('\n'));
}

async function main([command]) {
  const paths = pathsFor(join(root, 'apps/mobile'));
  if (command === 'sync') {
    console.log(`iOS set up for ${sync(paths)} (apps/mobile/.env).`);
    return;
  }
  if (!ENVIRONMENTS.includes(command)) {
    console.error(
      'Usage: pnpm switch-local | pnpm switch-staging | pnpm switch-production',
    );
    process.exitCode = 1;
    return;
  }
  await report(switchTo(command, paths));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
