#!/usr/bin/env node
/**
 * Builds the admin panel as one zip for shared hosting, where it is uploaded
 * and extracted by hand (see docs/deployment/shared-hosting.md → "Yönetim
 * paneli"):
 *
 *   pnpm admin:package:staging      # → quezby-admin.kubisimsek.com, talks to https://quezby.kubisimsek.com
 *   pnpm admin:package:production   # → quezby.com/panel (public_html/panel), talks to https://quezby.com/api
 *
 * → dist-deploy/quezby-admin-<env>-<timestamp>.zip: index.html, assets/,
 * .htaccess (routing, caching, CSP), robots.txt and the favicon — static
 * files only; the panel has no server of its own.
 *
 * Everything a Vite build reads from VITE_* ends up public in the bundle, so
 * the build is refused if any VITE_* other than VITE_API_ORIGIN is set.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN = join(root, 'apps/admin');
const OUT = join(root, 'dist-deploy');

export const ENVIRONMENTS = ['staging', 'production'];

/** The one VITE_* a panel build may carry: where the API is. It is public by design. */
export const PUBLIC_VARIABLES = ['VITE_API_ORIGIN'];

/** What a build must have produced for Apache to serve it as the panel. */
export const REQUIRED_FILES = ['index.html', '.htaccess'];

/** @returns {'staging' | 'production'} */
export function parseEnvironment(value) {
  if (ENVIRONMENTS.includes(value)) return value;
  throw new Error(`usage: package-admin.mjs <${ENVIRONMENTS.join('|')}>`);
}

/** `quezby-admin-staging-20260925-141503.zip`, in local time like the API's zip. */
export function archiveName(environment, now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `quezby-admin-${environment}-${stamp}.zip`;
}

/** The `.env` files Vite reads for a mode, most general first. */
export function envFilesFor(mode) {
  return ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
}

/**
 * The VITE_* names set to something in these `.env` texts that are not
 * allowed to ship — anything but the API origin.
 */
export function forbiddenVariables(texts) {
  const found = new Set();
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?(VITE_[A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, name, raw] = match;
      const value = raw.replace(/(^|\s+)#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
      if (value !== '' && !PUBLIC_VARIABLES.includes(name)) found.add(name);
    }
  }
  return [...found].sort();
}

/** Which of the required files a build folder lacks. */
export function missingFiles(dist) {
  return REQUIRED_FILES.filter((file) => !existsSync(join(dist, file)));
}

function step(message) {
  console.log(`→ ${message}`);
}

function sh(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

async function main(argv) {
  const environment = parseEnvironment(argv[0]);

  const texts = envFilesFor(environment)
    .map((file) => join(ADMIN, file))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'));
  const forbidden = forbiddenVariables([...texts, ...Object.entries(process.env).map(([key, value]) => `${key}=${value ?? ''}`)]);
  if (forbidden.length > 0) {
    throw new Error(`refusing to build: ${forbidden.join(', ')} would ship in the panel's public bundle. Only VITE_API_ORIGIN may be set.`);
  }

  step('Building the shared packages');
  sh('pnpm', ['build:packages']);
  step('Typechecking the panel');
  sh('pnpm', ['--filter', '@quezby/admin', 'exec', 'tsc', '--noEmit']);
  step(`Building the panel for ${environment}`);
  sh('pnpm', ['--filter', '@quezby/admin', 'exec', 'vite', 'build', '--mode', environment]);

  const dist = join(ADMIN, 'dist');
  const missing = missingFiles(dist);
  if (missing.length > 0) throw new Error(`the build has no ${missing.join(', ')}`);

  mkdirSync(OUT, { recursive: true });
  const name = archiveName(environment);
  step(`Zipping into dist-deploy/${name}`);
  sh('zip', ['-qrX', join(OUT, name), '.'], dist);

  const { ENVIRONMENTS: ORIGINS } = await import(pathToFileURL(join(ADMIN, 'deploy/environments.mjs')).href);
  console.log(`\n✓ dist-deploy/${name}`);
  const { adminOrigin, adminBase, apiOrigin } = ORIGINS[environment];
  console.log(`  Extract it where ${adminOrigin}${adminBase} is served from${adminBase === '/' ? ' (the document root)' : ` (public_html${adminBase.replace(/\/$/, '')})`}.`);
  console.log(`  It talks to ${apiOrigin}/api.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
