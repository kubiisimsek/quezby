import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  api2Data,
  bumpRelease,
  compareReleases,
  cpanel,
  dirVariable,
  folderVerdict,
  nextRelease,
  ops,
  parseArguments,
  readConfig,
  releaseIn,
  serverEnv,
  uapiData,
  unsafeDirectory,
} from './deploy.mjs';

const SETTINGS = {
  DEPLOY_CPANEL_USER: 'quezby',
  DEPLOY_CPANEL_TOKEN: 'TOKEN123',
  DEPLOY_STAGING_API_DIR: 'quezby-api-staging/',
  DEPLOY_STAGING_ADMIN_DIR: 'quezby-admin-staging',
  DEPLOY_PROD_API_DIR: 'public_html/api',
  DEPLOY_PROD_ADMIN_DIR: 'public_html/panel',
};

const SERVER_ENV = [
  'APP_ENV=production',
  'APP_KEY=base64:A+uQkyeqz/Tyh1xPRh3/CrVKpD0NegxFlrnPqyDDUHk=',
  'APP_DEBUG=false',
  'QUEZBY_DAILY_SECRET=daily',
  'MAIL_MAILER=smtp',
  'MAIL_HOST=mail.quezby.com',
  'MAIL_PASSWORD=x',
  'MAIL_FROM_ADDRESS=no-reply@quezby.com',
  'OPS_TOKEN=ops-secret-123',
].join('\n');

/** A fetch that answers from a list and remembers what it was asked. */
function fakeFetch(answers) {
  const calls = [];
  const request = async (url, init = {}) => {
    calls.push({ url: new URL(url), init });
    const [status, body] = answers.shift() ?? [500, null];
    return { status, ok: status >= 200 && status < 300, json: async () => body };
  };
  return { request, calls };
}

describe('release', () => {
  it('raises the level asked for and zeroes what comes after it', () => {
    assert.equal(bumpRelease('1.01.01.01', 'minipatch'), '1.01.01.02');
    assert.equal(bumpRelease('1.01.01.01', 'patch'), '1.01.02.00');
    assert.equal(bumpRelease('1.01.01.01', 'minor'), '1.02.00.00');
    assert.equal(bumpRelease('1.01.01.01', 'major'), '2.00.00.00');
  });

  it('starts at 1.00.00.01 and keeps counting past 99', () => {
    assert.equal(bumpRelease(null, 'minipatch'), '1.00.00.01');
    assert.equal(bumpRelease('1.00.00.99', 'minipatch'), '1.00.00.100');
    assert.equal(bumpRelease('9.99.00.00', 'minor'), '9.100.00.00');
  });

  it('compares part by part, not as text', () => {
    assert.ok(compareReleases('1.00.00.100', '1.00.00.99') > 0);
    assert.ok(compareReleases('2.00.00.00', '1.99.99.99') > 0);
    assert.equal(compareReleases('1.02.03.04', '1.02.03.04'), 0);
  });

  it('takes a release asked for only when it is higher than the server\'s', () => {
    assert.equal(nextRelease('1.00.00.05', { bump: 'minipatch', version: null }), '1.00.00.06');
    assert.equal(nextRelease('1.00.00.05', { bump: 'minipatch', version: '1.01.01.01' }), '1.01.01.01');
    assert.equal(nextRelease(null, { bump: 'minipatch', version: '1.01.01.01' }), '1.01.01.01');
    assert.throws(() => nextRelease('1.01.01.01', { bump: 'minipatch', version: '1.01.01.01' }), /not higher than 1.01.01.01/);
    assert.throws(() => nextRelease(null, { bump: 'minipatch', version: '1.1.1.1' }), /must look like 1.00.00.01/);
  });

  it('reads what the last deploy left, and nothing else', () => {
    assert.equal(releaseIn('{"version":"1.02.00.07","deployedAt":"2026-10-01T09:00:00Z"}'), '1.02.00.07');
    assert.equal(releaseIn(null), null);
    assert.equal(releaseIn('<html>'), null);
    assert.equal(releaseIn('{"version":"1.0.0"}'), null);
  });
});

describe('parseArguments', () => {
  it('deploys both parts, minipatch up, unless told otherwise', () => {
    assert.deepEqual(parseArguments(['production']), { environment: 'production', parts: ['api', 'admin'], bump: 'minipatch', version: null, dryRun: false });
  });

  it('reads the flags the workflow and pnpm pass', () => {
    assert.deepEqual(parseArguments(['staging', '--', '--only', 'admin', '--bump', 'minor', '--dry-run']), {
      environment: 'staging',
      parts: ['admin'],
      bump: 'minor',
      version: null,
      dryRun: true,
    });
    assert.deepEqual(parseArguments(['staging', '--only', 'all', '--version', '1.01.01.01']).parts, ['api', 'admin']);
    assert.equal(parseArguments(['staging', '--version', '1.01.01.01']).version, '1.01.01.01');
    assert.equal(parseArguments(['staging', '--version', '']).version, null);
  });

  it('refuses anything else', () => {
    assert.throws(() => parseArguments([]), /usage/);
    assert.throws(() => parseArguments(['local']), /usage/);
    assert.throws(() => parseArguments(['production', '--only', 'mobile']), /not understood/);
    assert.throws(() => parseArguments(['production', '--bump', 'huge']), /not understood/);
    assert.throws(() => parseArguments(['production', '--version', '1.0.0']), /must look like/);
  });
});

describe('unsafeDirectory', () => {
  it('lets a folder of its own through', () => {
    assert.equal(unsafeDirectory('public_html/api'), null);
    assert.equal(unsafeDirectory('quezby-api-staging'), null);
  });

  it('refuses what an extract would spill over', () => {
    for (const dir of [undefined, '', '  ', '.', './', 'public_html', 'public_html/', '/home/quezby/public_html/api', '~/public_html/api', 'public_html/../x', 'a\\b']) {
      assert.notEqual(unsafeDirectory(dir), null, `${dir} should be refused`);
    }
  });
});

describe('readConfig', () => {
  it('takes each environment\'s folders from its own variables', () => {
    assert.equal(dirVariable('production', 'api'), 'DEPLOY_PROD_API_DIR');
    assert.equal(dirVariable('staging', 'admin'), 'DEPLOY_STAGING_ADMIN_DIR');
    assert.deepEqual(readConfig(SETTINGS, 'staging', ['api', 'admin']), {
      host: 'quezby.com',
      port: '2083',
      user: 'quezby',
      token: 'TOKEN123',
      dirs: { api: 'quezby-api-staging', admin: 'quezby-admin-staging' },
    });
    assert.deepEqual(readConfig(SETTINGS, 'production', ['admin']).dirs, { admin: 'public_html/panel' });
  });

  it('asks only for the folder of what is deployed', () => {
    const { DEPLOY_PROD_ADMIN_DIR: _admin, ...apiOnly } = SETTINGS;
    assert.deepEqual(readConfig(apiOnly, 'production', ['api']).dirs, { api: 'public_html/api' });
    assert.throws(() => readConfig(apiOnly, 'production', ['api', 'admin']), /DEPLOY_PROD_ADMIN_DIR is empty/);
  });

  it('names every problem at once', () => {
    assert.throws(
      () => readConfig({ DEPLOY_CPANEL_USER: 'a b', DEPLOY_PROD_API_DIR: 'public_html' }, 'production', ['api', 'admin']),
      (error) =>
        ['DEPLOY_CPANEL_USER', 'DEPLOY_CPANEL_TOKEN', 'DEPLOY_PROD_API_DIR is a whole web root', 'DEPLOY_PROD_ADMIN_DIR is empty'].every((part) =>
          error.message.includes(part),
        ),
    );
    assert.throws(() => readConfig({ ...SETTINGS, DEPLOY_PROD_ADMIN_DIR: 'public_html/api' }, 'production', ['api', 'admin']), /cannot share a folder/);
  });
});

describe('serverEnv', () => {
  it('takes OPS_TOKEN from the .env that stays on the server', () => {
    assert.deepEqual(serverEnv(SERVER_ENV, 'production'), { errors: [], warnings: [], opsToken: 'ops-secret-123' });
  });

  it('refuses a server without a ready .env, naming what is wrong and never a value', () => {
    assert.match(serverEnv(null, 'production').errors[0], /no .env in the API folder/);
    const { errors } = serverEnv(SERVER_ENV.replace('OPS_TOKEN=ops-secret-123', 'OPS_TOKEN=').replace('APP_DEBUG=false', 'APP_DEBUG=true'), 'production');
    assert.equal(errors.length, 2);
    assert.match(errors.join(' '), /APP_DEBUG is on/);
    assert.match(errors.join(' '), /OPS_TOKEN is empty/);
    assert.match(serverEnv(SERVER_ENV, 'staging').errors[0], /APP_ENV is "production", not "staging"/);
    assert.ok(!JSON.stringify(serverEnv(SERVER_ENV.replace('APP_DEBUG=false', 'APP_DEBUG=true'), 'production')).includes('base64:'));
  });
});

describe('folderVerdict', () => {
  it('lets a new, an empty or the same folder through, and names a stranger', () => {
    assert.equal(folderVerdict(null, 'api'), 'new');
    assert.equal(folderVerdict([], 'api'), 'empty');
    assert.equal(folderVerdict(['artisan', 'vendor', '.env'], 'api'), 'same');
    assert.equal(folderVerdict(['index.html', 'assets'], 'admin'), 'same');
    assert.equal(folderVerdict(['index.html', 'assets'], 'api'), 'foreign');
    assert.equal(folderVerdict(['wp-config.php'], 'admin'), 'foreign');
  });
});

describe('uapiData / api2Data', () => {
  it('hands back what cPanel said yes to', () => {
    assert.deepEqual(uapiData({ status: 1, data: { home: '/home/quezby' } }, 'x'), { home: '/home/quezby' });
    assert.deepEqual(api2Data({ cpanelresult: { event: { result: 1 }, data: [{ result: 1 }] } }, 'x'), [{ result: 1 }]);
  });

  it('throws cPanel\'s own reason', () => {
    assert.throws(() => uapiData({ status: 0, errors: ['Disk quota exceeded'] }, 'uploading a.zip'), /refused uploading a.zip: Disk quota exceeded/);
    assert.throws(() => api2Data({ cpanelresult: { error: 'Permission denied', event: { result: 0 } } }, 'extracting'), /Permission denied/);
    assert.throws(() => api2Data({ cpanelresult: { event: { result: 1 }, data: [{ result: 0, reason: 'No such file' }] } }, 'extracting'), /No such file/);
    assert.throws(() => api2Data(null, 'extracting'), /no answer/);
  });
});

describe('cpanel', () => {
  const config = { host: 'quezby.com', port: '2083', user: 'quezby', token: 'TOKEN123' };

  it('signs every call with the API token', async () => {
    const { request, calls } = fakeFetch([[200, { status: 1, data: { home: '/home/quezby' } }]]);
    assert.equal(await cpanel(config, request).home(), '/home/quezby');
    assert.equal(calls[0].url.origin, 'https://quezby.com:2083');
    assert.equal(calls[0].init.headers.Authorization, 'cpanel quezby:TOKEN123');
  });

  it('says so when the token is wrong', async () => {
    const { request } = fakeFetch([[401, null]]);
    await assert.rejects(cpanel(config, request).home(), /does not accept the token for quezby/);
  });

  it('says so when it hands out its login page instead', async () => {
    const request = async () => ({ status: 200, ok: true, json: async () => JSON.parse('<!DOCTYPE html>') });
    await assert.rejects(cpanel(config, request).home(), /answered with a page, not the API/);
  });

  it('lists a folder, and reads a missing one as null', async () => {
    const { request, calls } = fakeFetch([
      [200, { status: 1, data: [{ file: 'artisan' }, { file: 'vendor' }] }],
      [200, { status: 0, errors: ['Directory does not exist'] }],
    ]);
    const panel = cpanel(config, request);
    assert.deepEqual(await panel.list('public_html/api'), ['artisan', 'vendor']);
    assert.equal(await panel.list('public_html/panel'), null);
    assert.equal(calls[0].url.searchParams.get('dir'), 'public_html/api');
  });

  it('reads a file, and a missing one as null', async () => {
    const { request, calls } = fakeFetch([
      [200, { status: 1, data: { content: '{"version":"1.00.00.03"}' } }],
      [200, { status: 0, errors: ['No such file'] }],
    ]);
    const panel = cpanel(config, request);
    assert.equal(await panel.read('public_html/api', 'version.json'), '{"version":"1.00.00.03"}');
    assert.equal(await panel.read('public_html/api', '.env'), null);
    assert.equal(calls[0].url.pathname, '/execute/Fileman/get_file_content');
    assert.equal(calls[1].url.searchParams.get('file'), '.env');
  });

  it('uploads the zip as a file, overwriting', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quezby-deploy-'));
    try {
      const zip = join(dir, 'quezby-admin-production-1.zip');
      writeFileSync(zip, 'PK');
      const { request, calls } = fakeFetch([[200, { status: 1, data: { succeeded: 1, uploads: [] } }]]);
      await cpanel(config, request).upload('/home/quezby', zip);
      const form = calls[0].init.body;
      assert.equal(calls[0].init.method, 'POST');
      assert.equal(form.get('dir'), '/home/quezby');
      assert.equal(form.get('overwrite'), '1');
      assert.equal(form.get('file-1').name, 'quezby-admin-production-1.zip');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('extracts and deletes through API 2', async () => {
    const ok = [200, { cpanelresult: { event: { result: 1 }, data: [{ result: 1 }] } }];
    const { request, calls } = fakeFetch([ok, ok]);
    const panel = cpanel(config, request);
    await panel.extract('/home/quezby/a.zip', '/home/quezby/public_html/api');
    await panel.remove('/home/quezby/a.zip');
    const [extract, remove] = calls.map((call) => Object.fromEntries(call.url.searchParams));
    assert.equal(calls[0].url.pathname, '/json-api/cpanel');
    assert.deepEqual(
      { module: extract.cpanel_jsonapi_module, func: extract.cpanel_jsonapi_func, op: extract.op, from: extract.sourcefiles, to: extract.destfiles },
      { module: 'Fileman', func: 'fileop', op: 'extract', from: '/home/quezby/a.zip', to: '/home/quezby/public_html/api' },
    );
    assert.equal(remove.op, 'unlink');
  });
});

describe('ops', () => {
  it('runs a chore with the token and hands back its output', async () => {
    const { request, calls } = fakeFetch([[200, { status: 'ok', output: '  Nothing to migrate.\n' }]]);
    assert.equal(await ops('https://quezby.com', 'migrate', 'abc', request), 'Nothing to migrate.');
    assert.equal(calls[0].url.href, 'https://quezby.com/api/v1/ops/migrate');
    assert.equal(calls[0].init.headers['X-Ops-Token'], 'abc');
  });

  it('explains the answers that stop a deploy', async () => {
    await assert.rejects(ops('https://quezby.com', 'migrate', 'abc', fakeFetch([[404, null]]).request), /no OPS_TOKEN/);
    await assert.rejects(ops('https://quezby.com', 'migrate', 'abc', fakeFetch([[429, null]]).request), /ten ops calls an hour/);
    await assert.rejects(
      ops('https://quezby.com', 'optimize', 'abc', fakeFetch([[500, { error: { message: 'SQLSTATE[HY000]' } }]]).request),
      /optimize answered 500: SQLSTATE/,
    );
  });
});
