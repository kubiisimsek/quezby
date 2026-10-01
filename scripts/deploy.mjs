#!/usr/bin/env node
/**
 * Builds the API and/or the admin panel, gives each a release and puts them
 * on the host through cPanel's own API — no SSH. Run by
 * .github/workflows/deploy.yml, or by hand:
 *
 *   pnpm deploy:staging                         # API, then the panel; minipatch +1
 *   pnpm deploy:production --only api           # only the API
 *   pnpm deploy:production --bump minor         # 1.00.03.07 → 1.01.00.00
 *   pnpm deploy:staging --version 1.01.01.01    # a release of your choosing
 *   pnpm deploy:staging --dry-run               # check and build, send nothing
 *   pnpm deploy:staging --changed-only          # skip a part unchanged since its last deploy
 *
 * Reads, from the environment (or from a git-ignored .env.deploy at the root):
 *   DEPLOY_CPANEL_USER, DEPLOY_CPANEL_TOKEN      cPanel → Manage API Tokens
 *   DEPLOY_STAGING_API_DIR, DEPLOY_STAGING_ADMIN_DIR
 *   DEPLOY_PROD_API_DIR, DEPLOY_PROD_ADMIN_DIR   relative to the cPanel home,
 *                                                e.g. public_html/api
 *
 * The API's .env lives on the server and is never sent: the zip is built
 * --without-env, and the deploy only reads the server's .env to check it
 * (APP_KEY, APP_ENV, APP_DEBUG) and to take OPS_TOKEN, which runs the
 * migrations through /api/v1/ops. The release — `1.00.00.01`: major, minor,
 * patch, minipatch — is read from the version.json the last deploy left in
 * each folder, raised, and written into the new build; /api/v1/health and the
 * panel's Sistem page show it.
 *
 * version.json also names the commit a part was built from: with
 * --changed-only (what a push to develop or main runs) a part whose files have
 * not changed since that commit is skipped, and nothing at all is sent when
 * neither has.
 *
 * Each zip goes to the home folder, is extracted over its folder — as the
 * manual steps do — and deleted. The API goes first because the panel's
 * tables come with its migrations. A folder that is neither empty nor what it
 * should hold (no `artisan` for the API, no `index.html` for the panel) is
 * refused.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, openAsBlob, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkApiEnv } from './check-api-env.mjs';
import { parseEnv } from './switch-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'dist-deploy');

/** One server, one cPanel, for both environments. */
export const CPANEL = Object.freeze({ host: 'quezby.com', port: '2083' });

export const ENVIRONMENTS = ['staging', 'production'];
export const PARTS = ['api', 'admin'];
export const BUMPS = ['major', 'minor', 'patch', 'minipatch'];

/**
 * What each part is built from: a change under one of these paths since the
 * commit the server's version.json names is a reason to deploy it again.
 */
export const SOURCES = Object.freeze({
  api: ['apps/api/', 'scripts/package-api.sh'],
  admin: ['apps/admin/', 'packages/types/', 'packages/sdk/', 'packages/config/', 'scripts/package-admin.mjs', 'pnpm-lock.yaml'],
});

/** The file that proves a folder already holds what is about to replace it. */
export const MARKER = { api: 'artisan', admin: 'index.html' };

/** Where a folder's variable is named: DEPLOY_PROD_API_DIR, DEPLOY_STAGING_ADMIN_DIR… */
export function dirVariable(environment, part) {
  return `DEPLOY_${environment === 'production' ? 'PROD' : 'STAGING'}_${part.toUpperCase()}_DIR`;
}

/* ------------------------------------------------------------- release -- */

/** The release before the first deploy; the first is its minipatch, 1.00.00.01. */
export const FIRST_BASE = '1.00.00.00';

const RELEASE = /^(\d+)\.(\d{2,})\.(\d{2,})\.(\d{2,})$/;

/** @returns {[number, number, number, number] | null} */
export function parseRelease(value) {
  const match = RELEASE.exec(String(value ?? '').trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])] : null;
}

/** `1.02.00.07`: the last three at least two digits. */
export function formatRelease([major, minor, patch, minipatch]) {
  const two = (value) => String(value).padStart(2, '0');
  return `${major}.${two(minor)}.${two(patch)}.${two(minipatch)}`;
}

/** Negative, zero or positive, as `a` comes before, with or after `b`. */
export function compareReleases(a, b) {
  const [x, y] = [parseRelease(a), parseRelease(b)];
  for (let index = 0; index < 4; index++) if (x[index] !== y[index]) return x[index] - y[index];
  return 0;
}

/** The next release: the level goes up by one, everything after it back to 00. */
export function bumpRelease(current, level) {
  const parts = parseRelease(current ?? FIRST_BASE);
  if (!parts) throw new Error(`"${current}" is not a release like 1.00.00.01`);
  const at = BUMPS.indexOf(level);
  if (at < 0) throw new Error(`--bump is one of ${BUMPS.join(', ')}`);
  return formatRelease(parts.map((value, index) => (index < at ? value : index === at ? value + 1 : 0)));
}

/**
 * The release a part is deployed as: the one asked for, which must be
 * higher than what the server has, or the server's raised by `bump`.
 */
export function nextRelease(current, { bump, version }) {
  if (!version) return bumpRelease(current, bump);
  if (!parseRelease(version)) throw new Error(`--version must look like 1.00.00.01, not "${version}"`);
  const normal = formatRelease(parseRelease(version));
  if (current && compareReleases(normal, current) <= 0) throw new Error(`--version ${normal} is not higher than ${current}, which the server has`);
  return normal;
}

/** The release in a version.json the last deploy left, or null. */
export function releaseIn(text) {
  try {
    const version = JSON.parse(text ?? '')?.version;
    return parseRelease(version) ? formatRelease(parseRelease(version)) : null;
  } catch {
    return null;
  }
}

/** The commit in a version.json the last deploy left, or null. */
export function commitIn(text) {
  try {
    const commit = JSON.parse(text ?? '')?.commit;
    return typeof commit === 'string' && /^[0-9a-f]{40}$/.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

/**
 * Whether a part has to go: yes without a commit to compare with, or when
 * git cannot compare (a commit it does not know, a shallow clone); otherwise
 * only when one of its sources changed since.
 *
 * @param {(args: string[]) => string} git runs git and hands back its output
 */
export function changedSince(commit, part, git) {
  if (!commit) return true;
  try {
    return git(['diff', '--name-only', commit, 'HEAD', '--', ...SOURCES[part]]).trim() !== '';
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------ settings -- */

/** @returns {{ environment: string, parts: string[], bump: string, version: string | null, dryRun: boolean, changedOnly: boolean }} */
export function parseArguments(argv) {
  const args = argv.filter((arg) => arg !== '--');
  const environment = args.shift();
  const usage = `usage: deploy.mjs <${ENVIRONMENTS.join('|')}> [--only api|admin] [--bump ${BUMPS.join('|')}] [--version 1.00.00.01] [--changed-only] [--dry-run]`;
  if (!ENVIRONMENTS.includes(environment)) throw new Error(usage);

  const options = { environment, parts: PARTS, bump: 'minipatch', version: null, dryRun: false, changedOnly: false };
  while (args.length > 0) {
    const [flag, value] = [args.shift(), args[0]];
    if (flag === '--dry-run') options.dryRun = true;
    else if (flag === '--changed-only') options.changedOnly = true;
    else if (flag === '--only' && PARTS.includes(value)) options.parts = [args.shift()];
    else if (flag === '--only' && value === 'all') args.shift();
    else if (flag === '--bump' && BUMPS.includes(value)) options.bump = args.shift();
    else if (flag === '--version' && value !== undefined) options.version = args.shift().trim() || null;
    else throw new Error(`${flag} ${value ?? ''}`.trim() + ` is not understood\n${usage}`);
  }
  if (options.version && !parseRelease(options.version)) throw new Error(`--version must look like 1.00.00.01, not "${options.version}"`);
  return options;
}

/**
 * Why a folder may not be deployed into, or null. A zip extracted over the
 * home folder or a whole web root would overwrite what else lives there, so
 * those, absolute paths and anything climbing out with `..` are refused.
 *
 * @returns {string | null}
 */
export function unsafeDirectory(value) {
  const dir = (value ?? '').trim();
  if (dir === '') return 'is empty';
  if (dir.startsWith('~') || dir.startsWith('/')) return 'must be relative to the cPanel home (public_html/api)';
  if (/[\0\n\r\\]/.test(dir)) return 'holds a character a path should not';
  const parts = dir.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.includes('..')) return 'climbs out with ..';
  if (parts.length === 0) return 'is the home folder';
  if (parts.length === 1 && ['public_html', 'www', 'htdocs'].includes(parts[0])) return 'is a whole web root';
  return null;
}

/**
 * The deploy settings, or every problem with them at once.
 *
 * @returns {{ host: string, port: string, user: string, token: string, dirs: Record<string, string> }}
 */
export function readConfig(env, environment, parts) {
  const problems = [];
  const user = (env.DEPLOY_CPANEL_USER ?? '').trim();
  const token = (env.DEPLOY_CPANEL_TOKEN ?? '').trim();
  if (!/^[a-z0-9_.-]+$/i.test(user)) problems.push('DEPLOY_CPANEL_USER is empty or not a cPanel user');
  if (token === '') problems.push('DEPLOY_CPANEL_TOKEN is empty');

  const dirs = {};
  for (const part of parts) {
    const name = dirVariable(environment, part);
    const problem = unsafeDirectory(env[name]);
    if (problem) problems.push(`${name} ${problem}`);
    else dirs[part] = posix.normalize(env[name].trim()).replace(/\/+$/, '');
  }
  if (dirs.api && dirs.api === dirs.admin) problems.push('the API and the panel cannot share a folder');
  if (problems.length > 0) throw new Error(problems.join('; '));
  return { ...CPANEL, user, token, dirs };
}

/**
 * What the server's .env says about deploying: its problems (names only,
 * never a value) and the OPS_TOKEN the migrations run with.
 *
 * @returns {{ errors: string[], warnings: string[], opsToken: string }}
 */
export function serverEnv(text, environment) {
  if (text === null) {
    return { errors: ['the server has no .env in the API folder: upload it there once (File Manager), it stays'], warnings: [], opsToken: '' };
  }
  const { errors, warnings } = checkApiEnv(text, environment);
  const opsToken = (parseEnv(text).get('OPS_TOKEN') ?? '').trim();
  if (opsToken === '') errors.push('OPS_TOKEN is empty in the server\'s .env: the deploy migrates with it (openssl rand -hex 32)');
  return { errors, warnings, opsToken };
}

/**
 * What a folder listing says about deploying a part into it.
 *
 * @param {string[] | null} names what the folder holds, null when it does not exist
 * @returns {'new' | 'empty' | 'same' | 'foreign'}
 */
export function folderVerdict(names, part) {
  if (names === null) return 'new';
  if (names.length === 0) return 'empty';
  return names.includes(MARKER[part]) ? 'same' : 'foreign';
}

/* -------------------------------------------------------------- cPanel -- */

/** UAPI's answer (`/execute/…`), or its errors thrown. */
export function uapiData(body, what) {
  if (body?.status === 1) return body.data;
  const errors = [...(body?.errors ?? []), ...(body?.messages ?? [])].filter(Boolean);
  throw new Error(`cPanel refused ${what}: ${errors.join(' ') || 'no reason given'}`);
}

/** cPanel API 2's answer (`/json-api/cpanel`), or its error thrown. */
export function api2Data(body, what) {
  const result = body?.cpanelresult;
  const first = result?.data?.[0];
  const error = result?.error ?? (first && Number(first.result) !== 1 ? first.reason || first.output || 'failed' : null);
  if (!result || error || Number(result.event?.result ?? 1) !== 1) {
    throw new Error(`cPanel refused ${what}: ${error ?? 'no answer'}`);
  }
  return result.data;
}

/** A small cPanel client; `request` is fetch, swapped in tests. */
export function cpanel({ host, port, user, token }, request = fetch) {
  const base = `https://${host}:${port}`;
  const headers = { Authorization: `cpanel ${user}:${token}` };

  async function call(path, init = {}) {
    const response = await request(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`cPanel at ${host}:${port} does not accept the token for ${user} (${response.status})`);
    }
    if (!response.ok) throw new Error(`cPanel at ${host}:${port} answered ${response.status}`);
    // Without a token it hands out its login page, with a 200.
    return response.json().catch(() => {
      throw new Error(`cPanel at ${host}:${port} answered with a page, not the API — is the token set?`);
    });
  }

  function api2(module, func, params) {
    const query = new URLSearchParams({
      cpanel_jsonapi_user: user,
      cpanel_jsonapi_apiversion: '2',
      cpanel_jsonapi_module: module,
      cpanel_jsonapi_func: func,
      ...params,
    });
    return call(`/json-api/cpanel?${query}`);
  }

  return {
    async home() {
      const data = uapiData(await call('/execute/Variables/get_user_information?name=home'), 'reading the home folder');
      if (typeof data?.home !== 'string' || !data.home.startsWith('/')) throw new Error('cPanel did not say where the home folder is');
      return data.home;
    },
    /** @returns {Promise<string[] | null>} what the folder holds, null when it does not exist */
    async list(dir) {
      const body = await call(`/execute/Fileman/list_files?${new URLSearchParams({ dir, types: 'file|dir|link' })}`);
      return body?.status === 1 ? (body.data ?? []).map((entry) => entry.file) : null;
    },
    /** @returns {Promise<string | null>} a file's text, null when it is not there */
    async read(dir, file) {
      const body = await call(`/execute/Fileman/get_file_content?${new URLSearchParams({ dir, file })}`);
      return body?.status === 1 && typeof body.data?.content === 'string' ? body.data.content : null;
    },
    async mkdir(path, name) {
      api2Data(await api2('Fileman', 'mkdir', { path, name }), `creating ${path}/${name}`);
    },
    async upload(dir, file) {
      const form = new FormData();
      form.append('dir', dir);
      form.append('overwrite', '1');
      form.append('file-1', await openAsBlob(file), basename(file));
      const data = uapiData(await call('/execute/Fileman/upload_files', { method: 'POST', body: form }), `uploading ${basename(file)}`);
      if (Number(data?.succeeded ?? 0) < 1) throw new Error(`cPanel did not keep ${basename(file)}: ${JSON.stringify(data?.uploads ?? [])}`);
    },
    async extract(zip, dir) {
      api2Data(await api2('Fileman', 'fileop', { op: 'extract', sourcefiles: zip, destfiles: dir, doubledecode: '0' }), `extracting into ${dir}`);
    },
    async remove(file) {
      api2Data(await api2('Fileman', 'fileop', { op: 'unlink', sourcefiles: file, doubledecode: '0' }), `deleting ${file}`);
    },
  };
}

/** Calls one of the API's ops routes (`migrate`, `optimize`) with its token. */
export async function ops(apiOrigin, chore, token, request = fetch) {
  const response = await request(`${apiOrigin}/api/v1/ops/${chore}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Ops-Token': token },
  });
  const body = await response.json().catch(() => null);
  if (response.ok && body?.status === 'ok') return String(body.output ?? '').trim();
  if (response.status === 404) throw new Error(`ops/${chore} answered 404: the server's .env has no OPS_TOKEN, or the API is not at ${apiOrigin}/api`);
  if (response.status === 401) throw new Error(`ops/${chore} answered 401: the API runs with another OPS_TOKEN than its .env says — refresh its cache (Sistem → Önbelleği yenile)`);
  if (response.status === 429) throw new Error(`ops/${chore} answered 429: ten ops calls an hour at most — wait and run the deploy again`);
  throw new Error(`ops/${chore} answered ${response.status}: ${body?.error?.message ?? 'see storage/logs on the host'}`);
}

/* ---------------------------------------------------------------- main -- */

function step(message) {
  console.log(`\n→ ${message}`);
}

/** process.env, filled from .env.deploy where it says nothing. */
function settings() {
  const file = join(root, '.env.deploy');
  const fromFile = existsSync(file) ? Object.fromEntries(parseEnv(readFileSync(file, 'utf8'))) : {};
  return { ...fromFile, ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined && value !== '')) };
}

function newest(prefix) {
  const zips = existsSync(OUT) ? readdirSync(OUT).filter((file) => file.startsWith(prefix) && file.endsWith('.zip')) : [];
  if (zips.length === 0) throw new Error(`no ${prefix}*.zip in dist-deploy`);
  return join(OUT, zips.sort((a, b) => statSync(join(OUT, b)).mtimeMs - statSync(join(OUT, a)).mtimeMs)[0]);
}

async function health(apiOrigin, release) {
  const url = `${apiOrigin}/api/v1/health`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === 'ok' && body.version === release) return console.log(`✓ ${url} → ok, ${release}`);
      console.log(`  ${url} → ${response.status}${body?.version ? `, ${body.version}` : ''}, trying again`);
    } catch (error) {
      console.log(`  ${url} → ${error instanceof Error ? error.message : String(error)}, trying again`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw new Error(`${url} does not answer ok with ${release} — see storage/logs on the host`);
}

async function main(argv) {
  const { environment, parts: asked, bump, version, dryRun, changedOnly } = parseArguments(argv);
  const config = readConfig(settings(), environment, asked);
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const commit = git(['rev-parse', 'HEAD']).trim();
  const { ENVIRONMENTS: ORIGINS } = await import(pathToFileURL(join(root, 'apps/admin/deploy/environments.mjs')).href);
  const { apiOrigin } = ORIGINS[environment];
  const name = { api: 'API', admin: 'panel' };

  // Everything that can refuse does so before anything is built or sent.
  step(`Checking ${environment} on cPanel at ${config.host}:${config.port}`);
  const panel = cpanel(config);
  const home = await panel.home();
  const verdicts = {};
  const releases = {};
  let opsToken = '';
  const parts = [];
  for (const part of asked) {
    const dir = config.dirs[part];
    verdicts[part] = folderVerdict(await panel.list(dir), part);
    if (verdicts[part] === 'foreign') {
      throw new Error(`refusing: ${dir} is not empty and has no ${MARKER[part]} — is ${dirVariable(environment, part)} right?`);
    }
    const deployed = verdicts[part] === 'same' ? await panel.read(dir, 'version.json') : null;
    const current = releaseIn(deployed);
    if (changedOnly && current && !changedSince(commitIn(deployed), part, git)) {
      console.log(`  ${name[part]} in ${dir}: ${current}, unchanged since ${commitIn(deployed).slice(0, 7)} — skipped`);
      continue;
    }
    if (part === 'api') {
      const env = serverEnv(verdicts.api === 'new' ? null : await panel.read(dir, '.env'), environment);
      for (const warning of env.warnings) console.warn(`  warning: ${warning}`);
      if (env.errors.length > 0) throw new Error(`${dir}/.env is not ready for ${environment}:\n${env.errors.map((error) => `  - ${error}`).join('\n')}`);
      opsToken = env.opsToken;
      if (process.env.GITHUB_ACTIONS === 'true') console.log(`::add-mask::${opsToken}`);
    }
    releases[part] = nextRelease(current, { bump, version });
    parts.push(part);
    console.log(`  ${name[part]} in ${dir}: ${current ?? 'no release yet'} → ${releases[part]}`);
  }
  if (parts.length === 0) {
    console.log(`\n✓ ${environment}: nothing changed since the last deploy, nothing sent`);
    return;
  }

  const zips = {};
  for (const part of parts) {
    step(`Building the ${name[part]} ${releases[part]} for ${environment}`);
    const env = { ...process.env, QUEZBY_RELEASE: releases[part], QUEZBY_COMMIT: commit };
    if (part === 'api') {
      execFileSync('./scripts/package-api.sh', [environment, '--without-env'], { cwd: root, stdio: 'inherit', env });
      zips.api = newest(`quezby-api-${environment}-`);
      // The server's .env is the one that counts: a zip carrying another would overwrite it.
      if (execFileSync('unzip', ['-Z1', zips.api], { encoding: 'utf8' }).split('\n').includes('.env')) {
        throw new Error(`${basename(zips.api)} carries a .env — refusing to send it`);
      }
    } else {
      execFileSync('node', ['scripts/package-admin.mjs', environment], { cwd: root, stdio: 'inherit', env });
      zips.admin = newest(`quezby-admin-${environment}-`);
    }
  }

  if (dryRun) {
    for (const part of parts) console.log(`  would extract ${basename(zips[part])} into ${config.dirs[part]} as ${releases[part]}`);
    console.log(`\n✓ ${environment} checked (dry run, nothing sent)`);
    return;
  }

  for (const part of parts) {
    const dir = config.dirs[part];
    const uploaded = posix.join(home, basename(zips[part]));
    step(`Uploading the ${name[part]} ${releases[part]} into ${dir}`);
    if (verdicts[part] === 'new') {
      const absolute = posix.join(home, dir);
      await panel.mkdir(posix.dirname(absolute), posix.basename(absolute));
    }
    await panel.upload(home, zips[part]);
    try {
      await panel.extract(uploaded, posix.join(home, dir));
    } finally {
      await panel.remove(uploaded).catch((error) => console.warn(`warning: ${error.message} — delete ${uploaded} by hand`));
    }

    if (part === 'api') {
      step('Migrating and caching');
      console.log(await ops(apiOrigin, 'migrate', opsToken));
      console.log(await ops(apiOrigin, 'optimize', opsToken));
      await health(apiOrigin, releases.api);
    }
  }
  console.log(`\n✓ ${environment}: ${parts.map((part) => `${name[part]} ${releases[part]}`).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
