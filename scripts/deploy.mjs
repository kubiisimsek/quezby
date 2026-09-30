#!/usr/bin/env node
/**
 * Builds the API and/or the admin panel and puts them on the host over SSH —
 * the one-button form of docs/deployment/shared-hosting.md, run by
 * .github/workflows/deploy.yml (or by hand, with the same variables):
 *
 *   node scripts/deploy.mjs production          # API, then the panel
 *   node scripts/deploy.mjs staging api         # only the API
 *   node scripts/deploy.mjs production admin    # only the panel
 *
 * Reads, from the environment:
 *   DEPLOY_SSH_HOST, DEPLOY_SSH_USER   who to log in as
 *   DEPLOY_SSH_PORT                    default 22
 *   DEPLOY_API_DIR                     e.g. public_html/api (relative to the SSH home, or absolute)
 *   DEPLOY_ADMIN_DIR                   e.g. public_html/panel
 *   DEPLOY_PHP                         the host's PHP 8.3 CLI, default php
 *   DEPLOY_DRY_RUN=1                   list what rsync would change or delete;
 *                                      nothing is uploaded or migrated
 *
 * The API needs apps/api/.env.<env>: the upload replaces the server's .env
 * with it, so without it nothing is sent. Both builds are made before
 * anything is uploaded; the API goes first because the panel's tables come
 * with its migrations. Players' photos and the keys under storage/ are never
 * touched, and a folder that is neither empty nor what it should hold (no
 * `artisan` for the API, no `index.html` for the panel) is refused — the
 * upload deletes what the build does not have.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'dist-deploy');

export const ENVIRONMENTS = ['staging', 'production'];
export const TARGETS = ['all', 'api', 'admin'];

/** What stays on the server whatever the build holds: uploads, keys, the host's own logs. */
export const PROTECTED = {
  api: ['/storage/', '/public/storage', 'error_log'],
  admin: ['error_log'],
};

/** The file that proves a folder already holds what is about to replace it. */
export const MARKER = { api: 'artisan', admin: 'index.html' };

/** @returns {{ environment: 'staging' | 'production', target: 'all' | 'api' | 'admin' }} */
export function parseArguments(argv) {
  const [environment, target = 'all'] = argv;
  if (!ENVIRONMENTS.includes(environment) || !TARGETS.includes(target)) {
    throw new Error(`usage: deploy.mjs <${ENVIRONMENTS.join('|')}> [${TARGETS.join('|')}]`);
  }
  return { environment, target };
}

/**
 * Why a remote folder may not be deployed into, or null. `rsync --delete`
 * empties whatever it is pointed at, so the home folder, the web root and
 * anything climbing out with `..` are refused outright.
 *
 * @returns {string | null}
 */
export function unsafeDirectory(value) {
  const dir = (value ?? '').trim();
  if (dir === '') return 'is empty';
  if (dir.startsWith('~')) return 'starts with ~ — write it relative to the SSH home instead (public_html/api)';
  if (/[\0\n\r]/.test(dir)) return 'holds a control character';
  const parts = dir.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.includes('..')) return 'climbs out with ..';
  if (parts.length === 0) return 'is the home or the root folder';
  if (parts.length === 1 && ['public_html', 'www', 'htdocs', 'home'].includes(parts[0])) return 'is a whole web root';
  if (dir.startsWith('/') && parts.length < 3) return 'is too close to the root';
  return null;
}

/** One word for a POSIX shell, quoted. */
export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

/**
 * The deploy settings from the environment, or every problem with them.
 *
 * @returns {{ host: string, user: string, port: string, php: string, dirs: { api?: string, admin?: string } }}
 */
export function readConfig(env, target) {
  const problems = [];
  const host = (env.DEPLOY_SSH_HOST ?? '').trim();
  const user = (env.DEPLOY_SSH_USER ?? '').trim();
  const port = (env.DEPLOY_SSH_PORT ?? '').trim() || '22';
  const php = (env.DEPLOY_PHP ?? '').trim() || 'php';
  if (host === '') problems.push('DEPLOY_SSH_HOST is empty');
  if (user === '') problems.push('DEPLOY_SSH_USER is empty');
  if (!/^\d{1,5}$/.test(port)) problems.push('DEPLOY_SSH_PORT is not a port');
  if (/[\s;&|`$<>]/.test(php)) problems.push('DEPLOY_PHP must be one path to the PHP binary');

  const dirs = {};
  for (const part of partsOf(target)) {
    const name = `DEPLOY_${part.toUpperCase()}_DIR`;
    const problem = unsafeDirectory(env[name]);
    if (problem) problems.push(`${name} ${problem}`);
    else dirs[part] = env[name].trim().replace(/\/+$/, '');
  }
  if (problems.length > 0) throw new Error(problems.join('; '));
  return { host, user, port, php, dirs };
}

/** @returns {Array<'api' | 'admin'>} in upload order */
export function partsOf(target) {
  return target === 'all' ? ['api', 'admin'] : [target];
}

/** Refuses a folder that already holds something other than this part. */
export function guardCommand(dir, part) {
  const d = shellQuote(dir);
  return [
    `mkdir -p ${d}`,
    `if [ -n "$(ls -A ${d})" ] && [ ! -e ${d}/${MARKER[part]} ]; then echo "refusing: ${dir} is not empty and has no ${MARKER[part]}" >&2; exit 3; fi`,
  ].join(' && ');
}

/** What the API needs after new code lands: its migrations, then fresh caches. */
export function migrateCommand(dir, php) {
  const d = shellQuote(dir);
  return `cd ${d} && ${php} artisan migrate --force --no-interaction && ${php} artisan optimize`;
}

/**
 * rsync's arguments for one part. New files arrive beside the old ones and
 * swap in together at the end (`--delay-updates`); what the build no longer
 * has is removed only after that (`--delete-after`). A dry run only lists
 * what would change.
 */
export function rsyncArguments({ from, dir, part, host, user, port, dryRun = false }) {
  return [
    ...(dryRun ? ['--dry-run', '--itemize-changes'] : []),
    '-rlpz',
    '--checksum',
    '--delete-after',
    '--delay-updates',
    '--chmod=D755,F644',
    ...PROTECTED[part].map((path) => `--filter=P ${path}`),
    '-e',
    `ssh -p ${port} -o BatchMode=yes`,
    `${from.replace(/\/?$/, '/')}`,
    `${user}@${host}:${dir}/`,
  ];
}

function step(message) {
  console.log(`\n→ ${message}`);
}

function sh(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function newest(prefix) {
  const zips = existsSync(OUT) ? readdirSync(OUT).filter((file) => file.startsWith(prefix) && file.endsWith('.zip')) : [];
  if (zips.length === 0) throw new Error(`no ${prefix}*.zip in dist-deploy`);
  return join(OUT, zips.sort((a, b) => statSync(join(OUT, b)).mtimeMs - statSync(join(OUT, a)).mtimeMs)[0]);
}

async function health(environment) {
  const { ENVIRONMENTS: ORIGINS } = await import(pathToFileURL(join(root, 'apps/admin/deploy/environments.mjs')).href);
  const url = `${ORIGINS[environment].apiOrigin}/api/v1/health`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === 'ok') return console.log(`✓ ${url} → ok`);
      console.log(`  ${url} → ${response.status}, trying again`);
    } catch (error) {
      console.log(`  ${url} → ${error instanceof Error ? error.message : String(error)}, trying again`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw new Error(`${url} does not answer ok — see storage/logs on the host`);
}

async function main(argv) {
  const { environment, target } = parseArguments(argv);
  const config = readConfig(process.env, target);
  const parts = partsOf(target);
  const dryRun = process.env.DEPLOY_DRY_RUN === '1';
  const ssh = (command) => sh('ssh', ['-p', config.port, '-o', 'BatchMode=yes', `${config.user}@${config.host}`, command]);

  if (parts.includes('api') && !existsSync(join(root, `apps/api/.env.${environment}`))) {
    throw new Error(`apps/api/.env.${environment} is missing — the upload would leave the API without APP_KEY`);
  }

  const work = mkdtempSync(join(tmpdir(), 'quezby-deploy-'));
  try {
    const builds = {};
    if (parts.includes('api')) {
      step(`Building the API for ${environment}`);
      sh('./scripts/package-api.sh', [environment]);
      builds.api = join(work, 'api');
      sh('unzip', ['-q', newest(`quezby-api-${environment}-`), '-d', builds.api]);
    }
    if (parts.includes('admin')) {
      step(`Building the panel for ${environment}`);
      sh('node', ['scripts/package-admin.mjs', environment]);
      builds.admin = join(work, 'admin');
      sh('unzip', ['-q', newest(`quezby-admin-${environment}-`), '-d', builds.admin]);
    }

    for (const part of parts) {
      const dir = config.dirs[part];
      step(`${dryRun ? 'Dry run: what would change in' : 'Uploading to'} ${config.host}:${dir}`);
      ssh(guardCommand(dir, part));
      sh('rsync', rsyncArguments({ from: builds[part], dir, part, ...config, dryRun }));
      if (part === 'api' && !dryRun) {
        step('Migrating and caching');
        ssh(migrateCommand(dir, config.php));
        await health(environment);
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`\n✓ ${parts.join(' + ')} ${dryRun ? 'checked (dry run, nothing sent)' : 'deployed'} for ${environment}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
