import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { appKeyProblem, checkApiEnv, debugIsOn, parseEnvironment } from './check-api-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts/check-api-env.mjs');

const KEY = `base64:${randomBytes(32).toString('base64')}`;

/** A `.env` the way the staging example wants it, with `overrides` on top. */
function env(overrides = {}) {
  const values = {
    APP_ENV: 'staging',
    APP_KEY: KEY,
    APP_DEBUG: 'false',
    QUEZBY_DAILY_SECRET: 'a-long-random-daily-secret',
    MAIL_MAILER: 'smtp',
    MAIL_HOST: 'mail.quezby.com',
    MAIL_PASSWORD: 'a-mailbox-password',
    MAIL_FROM_ADDRESS: 'no-reply@quezby.com',
    ...overrides,
  };
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${value}`)
    .join('\n');
}

describe('parseEnvironment', () => {
  it('checks staging and production only', () => {
    assert.equal(parseEnvironment('staging'), 'staging');
    assert.equal(parseEnvironment('production'), 'production');
    assert.throws(() => parseEnvironment('local'), /usage/);
    assert.throws(() => parseEnvironment(undefined), /usage/);
  });
});

describe('appKeyProblem', () => {
  it('takes what key:generate prints', () => {
    assert.equal(appKeyProblem(KEY), null);
  });

  it('calls an empty key missing', () => {
    assert.equal(appKeyProblem(''), 'missing');
    assert.equal(appKeyProblem('   '), 'missing');
    assert.equal(appKeyProblem(undefined), 'missing');
  });

  it('calls anything else malformed', () => {
    assert.equal(appKeyProblem(KEY.slice('base64:'.length)), 'malformed');
    assert.equal(appKeyProblem(`base64:${randomBytes(16).toString('base64')}`), 'malformed');
    assert.equal(appKeyProblem(`base64:${randomBytes(33).toString('base64')}`), 'malformed');
    assert.equal(appKeyProblem('base64:%%%%'), 'malformed');
    assert.equal(appKeyProblem('base64:'), 'malformed');
  });
});

describe('debugIsOn', () => {
  it('reads APP_DEBUG the way Laravel casts it', () => {
    for (const off of ['', 'false', 'FALSE', '(false)', '0', 'null', '(null)', 'empty', '(empty)', undefined]) {
      assert.equal(debugIsOn(off), false, `${off} is off`);
    }
    for (const on of ['true', '(true)', '1', 'yes', 'on', 'no']) {
      assert.equal(debugIsOn(on), true, `${on} is on`);
    }
  });
});

describe('checkApiEnv', () => {
  it('passes a file that is ready', () => {
    assert.deepEqual(checkApiEnv(env(), 'staging'), { errors: [], warnings: [] });
  });

  it('refuses the file staging went out with: no key, and local', () => {
    const { errors } = checkApiEnv(env({ APP_KEY: '', APP_ENV: 'local' }), 'staging');
    assert.equal(errors.length, 2);
    assert.match(errors[0], /^APP_KEY is empty/);
    assert.match(errors[1], /^APP_ENV is "local", not "staging"/);
  });

  it('refuses a malformed key', () => {
    const { errors } = checkApiEnv(env({ APP_KEY: 'base64:short' }), 'staging');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^APP_KEY is not a key/);
  });

  it('refuses another environment, and reads a missing APP_ENV as Laravel does', () => {
    assert.match(checkApiEnv(env(), 'production').errors[0], /not "production"/);
    assert.deepEqual(checkApiEnv(env({ APP_ENV: undefined }), 'production').errors, []);
    assert.equal(checkApiEnv(env({ APP_ENV: undefined }), 'staging').errors.length, 1);
  });

  it('refuses debug mode', () => {
    const { errors } = checkApiEnv(env({ APP_DEBUG: 'yes' }), 'staging');
    assert.deepEqual(errors, ['APP_DEBUG is on: the API refuses to start in staging until it is false.']);
  });

  it('only warns about an empty daily secret', () => {
    const { errors, warnings } = checkApiEnv(env({ QUEZBY_DAILY_SECRET: '' }), 'staging');
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^QUEZBY_DAILY_SECRET is empty/);
  });

  it('only warns when email codes cannot go out: not smtp, or smtp half filled in', () => {
    const logged = checkApiEnv(env({ MAIL_MAILER: 'log' }), 'staging');
    assert.deepEqual(logged.errors, []);
    assert.match(logged.warnings[0], /^MAIL_MAILER is "log", not smtp/);

    const half = checkApiEnv(env({ MAIL_HOST: '', MAIL_PASSWORD: '' }), 'staging');
    assert.deepEqual(half.errors, []);
    assert.deepEqual(half.warnings, ['MAIL_HOST, MAIL_PASSWORD are empty: email codes cannot be sent.']);
  });

  it('reads quotes, comments, CRLF and repeated lines the way dotenv does', () => {
    const text = [
      '# staging',
      'APP_KEY=',
      'APP_ENV=local',
      `APP_KEY="${KEY}"`,
      "APP_ENV='staging'",
      'APP_DEBUG=false # must stay false',
      'QUEZBY_DAILY_SECRET=secret',
      'MAIL_MAILER=smtp',
      'MAIL_HOST=mail.quezby.com',
      'MAIL_PASSWORD="a # in a password"',
      'MAIL_FROM_ADDRESS=no-reply@quezby.com',
    ].join('\r\n');
    assert.deepEqual(checkApiEnv(text, 'staging'), { errors: [], warnings: [] });
  });

  it('never prints a value it read', () => {
    const secret = 'base64:c2VjcmV0LXZhbHVlLXRoYXQtaXMtbm90LTMyLWJ5dGVz';
    const { errors, warnings } = checkApiEnv(env({ APP_KEY: secret, APP_DEBUG: 'true' }), 'staging');
    for (const message of [...errors, ...warnings]) {
      assert.ok(!message.includes(secret.slice('base64:'.length)), message);
    }
  });

  it('holds the committed examples to their one blank: the key', () => {
    for (const environment of ['staging', 'production']) {
      const text = readFileSync(join(root, `apps/api/.env.${environment}.example`), 'utf8');
      const { errors } = checkApiEnv(text, environment);
      assert.equal(errors.length, 1, `${environment}: ${errors.join(' | ')}`);
      assert.match(errors[0], /^APP_KEY is empty/);
    }
  });
});

describe('the command', () => {
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('exits 0 for a ready file and 1 for a broken one, naming what is wrong', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quezby-api-env-'));
    try {
      const ready = join(dir, 'ready.env');
      const broken = join(dir, 'broken.env');
      writeFileSync(ready, env());
      writeFileSync(broken, env({ APP_KEY: '', APP_ENV: 'local' }));

      const ok = run('staging', ready);
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stdout, /is ready for staging/);

      const refused = run('staging', broken);
      assert.equal(refused.status, 1);
      assert.match(refused.stderr, /APP_KEY is empty/);
      assert.match(refused.stderr, /APP_ENV is "local"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits 1 for a missing file or environment', () => {
    assert.equal(run('staging', join(tmpdir(), 'quezby-no-such.env')).status, 1);
    assert.equal(run('local').status, 1);
  });
});
