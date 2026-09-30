import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  guardCommand,
  migrateCommand,
  parseArguments,
  partsOf,
  readConfig,
  rsyncArguments,
  shellQuote,
  unsafeDirectory,
} from './deploy.mjs';

const SETTINGS = {
  DEPLOY_SSH_HOST: 'quezby.com',
  DEPLOY_SSH_USER: 'kubi',
  DEPLOY_API_DIR: 'public_html/api/',
  DEPLOY_ADMIN_DIR: 'public_html/panel',
};

describe('parseArguments', () => {
  it('deploys both parts unless told otherwise', () => {
    assert.deepEqual(parseArguments(['production']), { environment: 'production', target: 'all' });
    assert.deepEqual(parseArguments(['staging', 'admin']), { environment: 'staging', target: 'admin' });
  });

  it('refuses anything else', () => {
    assert.throws(() => parseArguments([]), /usage/);
    assert.throws(() => parseArguments(['local']), /usage/);
    assert.throws(() => parseArguments(['production', 'mobile']), /usage/);
  });
});

describe('partsOf', () => {
  it('uploads the API before the panel, whose tables come with its migrations', () => {
    assert.deepEqual(partsOf('all'), ['api', 'admin']);
    assert.deepEqual(partsOf('admin'), ['admin']);
  });
});

describe('unsafeDirectory', () => {
  it('lets a folder of its own through', () => {
    assert.equal(unsafeDirectory('public_html/api'), null);
    assert.equal(unsafeDirectory('quezby-api-staging'), null);
    assert.equal(unsafeDirectory('/home/kubi/public_html/panel'), null);
  });

  it('refuses what rsync --delete would empty', () => {
    for (const dir of [undefined, '', '  ', '.', './', '/', 'public_html', 'public_html/', '/home/kubi', '~/public_html/api', 'public_html/../x']) {
      assert.notEqual(unsafeDirectory(dir), null, `${dir} should be refused`);
    }
  });
});

describe('readConfig', () => {
  it('reads the settings with their defaults', () => {
    assert.deepEqual(readConfig(SETTINGS, 'all'), {
      host: 'quezby.com',
      user: 'kubi',
      port: '22',
      php: 'php',
      dirs: { api: 'public_html/api', admin: 'public_html/panel' },
    });
  });

  it('asks only for the folder of what is deployed', () => {
    const { DEPLOY_ADMIN_DIR: _admin, ...apiOnly } = SETTINGS;
    assert.deepEqual(readConfig(apiOnly, 'api').dirs, { api: 'public_html/api' });
    assert.throws(() => readConfig(apiOnly, 'all'), /DEPLOY_ADMIN_DIR is empty/);
  });

  it('names every problem at once', () => {
    assert.throws(
      () => readConfig({ DEPLOY_SSH_PORT: 'x', DEPLOY_PHP: 'php; rm -rf ~', DEPLOY_API_DIR: 'public_html' }, 'api'),
      (error) =>
        ['DEPLOY_SSH_HOST', 'DEPLOY_SSH_USER', 'DEPLOY_SSH_PORT', 'DEPLOY_PHP', 'DEPLOY_API_DIR is a whole web root'].every((part) =>
          error.message.includes(part),
        ),
    );
  });
});

describe('shellQuote', () => {
  it('keeps a value one word', () => {
    assert.equal(shellQuote("it's here"), `'it'\\''s here'`);
    assert.equal(execFileSync('sh', ['-c', `printf %s ${shellQuote("a b'c $HOME")}`], { encoding: 'utf8' }), "a b'c $HOME");
  });
});

describe('guardCommand', () => {
  function run(dir, part) {
    try {
      execFileSync('sh', ['-c', guardCommand(dir, part)], { stdio: 'pipe' });
      return 0;
    } catch (error) {
      return error.status;
    }
  }

  it('lets a new, an empty or the same folder through, and refuses a stranger', () => {
    const home = mkdtempSync(join(tmpdir(), 'quezby-guard-'));
    try {
      assert.equal(run(join(home, 'new/api'), 'api'), 0);
      assert.equal(run(join(home, 'new/api'), 'api'), 0);

      writeFileSync(join(home, 'new/api/artisan'), '');
      assert.equal(run(join(home, 'new/api'), 'api'), 0);
      assert.equal(run(join(home, 'new/api'), 'admin'), 3);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('migrateCommand', () => {
  it('migrates, then caches, with the host PHP', () => {
    assert.equal(
      migrateCommand('public_html/api', '/opt/cpanel/ea-php83/root/usr/bin/php'),
      "cd 'public_html/api' && /opt/cpanel/ea-php83/root/usr/bin/php artisan migrate --force --no-interaction && /opt/cpanel/ea-php83/root/usr/bin/php artisan optimize",
    );
  });
});

describe('rsyncArguments', () => {
  const args = rsyncArguments({ from: '/tmp/build', dir: 'public_html/api', part: 'api', host: 'quezby.com', user: 'kubi', port: '2222' });

  it('copies the folder contents into the remote folder', () => {
    assert.deepEqual(args.slice(-2), ['/tmp/build/', 'kubi@quezby.com:public_html/api/']);
    assert.ok(args.includes('ssh -p 2222 -o BatchMode=yes'));
  });

  it('never deletes players\' photos, keys or the host\'s logs', () => {
    assert.ok(args.includes('--delete-after'));
    assert.ok(args.includes('--filter=P /storage/'));
    assert.ok(args.includes('--filter=P error_log'));
  });

  it('only lists the changes on a dry run', () => {
    assert.ok(!args.includes('--dry-run'));
    const dry = rsyncArguments({ from: '/tmp/build', dir: 'public_html/api', part: 'api', host: 'quezby.com', user: 'kubi', port: '22', dryRun: true });
    assert.deepEqual(dry.slice(0, 2), ['--dry-run', '--itemize-changes']);
  });
});
