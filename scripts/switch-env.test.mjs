import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DISPLAY_NAMES,
  PLACEHOLDER_URL_SCHEME,
  apiUrlFor,
  googleUrlScheme,
  missingKeys,
  parseEnv,
  pathsFor,
  switchTo,
  sync,
  withEnvironment,
  xcconfigFor,
} from './switch-env.mjs';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '../apps/mobile');
const EXAMPLE = readFileSync(join(MOBILE, '.env.example'), 'utf8');
const IOS_CLIENT =
  '123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com';

describe('parseEnv', () => {
  it('reads keys the way dotenv does', () => {
    const values = parseEnv(
      [
        '# a comment',
        'QUEZBY_ENV=staging',
        'API_URL_STAGING = https://staging.example.com # the staging API',
        'GOOGLE_IOS_CLIENT_ID="quoted # not a comment"',
        "export GOOGLE_WEB_CLIENT_ID='single'",
        'EMPTY=',
        'QUEZBY_ENV=production\r',
      ].join('\n'),
    );

    assert.equal(values.get('QUEZBY_ENV'), 'production');
    assert.equal(values.get('API_URL_STAGING'), 'https://staging.example.com');
    assert.equal(values.get('GOOGLE_IOS_CLIENT_ID'), 'quoted # not a comment');
    assert.equal(values.get('GOOGLE_WEB_CLIENT_ID'), 'single');
    assert.equal(values.get('EMPTY'), '');
    assert.equal(values.has('a'), false);
  });
});

describe('withEnvironment', () => {
  it('rewrites the one line that names the environment, and nothing else', () => {
    const switched = withEnvironment(EXAMPLE, 'staging');

    assert.equal(parseEnv(switched).get('QUEZBY_ENV'), 'staging');
    assert.deepEqual(
      switched.split('\n').filter((line, index) => line !== EXAMPLE.split('\n')[index]),
      ['QUEZBY_ENV=staging'],
    );
  });

  it('keeps one line when a hand-edited file has several', () => {
    const switched = withEnvironment(
      'QUEZBY_ENV=local\nAPI_URL_LOCAL=x\nexport QUEZBY_ENV=production\n',
      'staging',
    );

    assert.equal(switched, 'QUEZBY_ENV=staging\nAPI_URL_LOCAL=x\n');
  });

  it('adds the line below the opening comments when there is none', () => {
    assert.equal(
      withEnvironment('# Quezby\n\nAPI_URL_LOCAL=x\n', 'production'),
      '# Quezby\n\nQUEZBY_ENV=production\n\nAPI_URL_LOCAL=x\n',
    );
    assert.equal(withEnvironment('', 'local'), 'QUEZBY_ENV=local\n');
    assert.equal(withEnvironment('# only a comment\n', 'local'), '# only a comment\n\nQUEZBY_ENV=local\n');
  });
});

describe('googleUrlScheme', () => {
  it('turns the iOS client id around', () => {
    assert.equal(
      googleUrlScheme(IOS_CLIENT),
      'com.googleusercontent.apps.123456789012-abcdefghijklmnopqrstuvwxyz012345',
    );
    assert.equal(googleUrlScheme(` ${IOS_CLIENT} `)?.startsWith('com.googleusercontent.apps.'), true);
  });

  it('has none for anything else', () => {
    assert.equal(googleUrlScheme(''), null);
    assert.equal(googleUrlScheme(undefined), null);
    assert.equal(googleUrlScheme('not-a-client-id'), null);
  });
});

describe('xcconfigFor', () => {
  it('names the app for its environment and registers Google’s scheme', () => {
    const text = xcconfigFor('staging', new Map([['GOOGLE_IOS_CLIENT_ID', IOS_CLIENT]]));

    assert.match(text, /^QUEZBY_ENV = staging$/m);
    assert.match(text, /^QUEZBY_DISPLAY_NAME = Quezby Staging$/m);
    assert.match(
      text,
      /^GOOGLE_IOS_URL_SCHEME = com\.googleusercontent\.apps\.123456789012-/m,
    );
  });

  it('holds a placeholder scheme until Google is set up', () => {
    assert.match(
      xcconfigFor('production', new Map()),
      new RegExp(`^GOOGLE_IOS_URL_SCHEME = ${PLACEHOLDER_URL_SCHEME}$`, 'm'),
    );
  });

  it('agrees with the defaults the iOS project builds with before any switch', () => {
    const committed = readFileSync(join(MOBILE, 'ios/Config/Environment.xcconfig'), 'utf8');
    const settings = (text) =>
      Object.fromEntries(
        text
          .split('\n')
          .map((line) => line.match(/^([A-Z_]+) = (.*)$/))
          .filter(Boolean)
          .map((match) => [match[1], match[2]]),
      );

    assert.deepEqual(settings(committed), settings(xcconfigFor('local', new Map())));
    assert.match(committed, /^#include\? "Environment\.generated\.xcconfig"$/m);
  });
});

describe('the Android build', () => {
  it('reads the same environment and names the app the same way', () => {
    const gradle = readFileSync(join(MOBILE, 'android/app/build.gradle'), 'utf8');
    const names = gradle.match(/\[local: "([^"]+)", staging: "([^"]+)", production: "([^"]+)"\]/);

    assert.deepEqual(names?.slice(1), [
      DISPLAY_NAMES.local,
      DISPLAY_NAMES.staging,
      DISPLAY_NAMES.production,
    ]);
    assert.match(gradle, /applicationId "com\.kubisimsek\.game\.quezby"/);
    assert.doesNotMatch(gradle, /applicationIdSuffix|productFlavors/);
  });
});

describe('apiUrlFor', () => {
  it('takes the environment’s URL from .env, or the usual one', () => {
    const values = new Map([['API_URL_STAGING', 'https://staging.example.com/']]);

    assert.equal(apiUrlFor('staging', values), 'https://staging.example.com');
    assert.equal(apiUrlFor('production', values), 'https://api.quezby.com');
    assert.equal(apiUrlFor('local', new Map()), 'http://localhost:8000');
  });
});

describe('missingKeys', () => {
  it('names what the example has and .env lacks', () => {
    assert.deepEqual(missingKeys('QUEZBY_ENV=local\n', 'QUEZBY_ENV=\nAPI_URL_LOCAL=\n'), [
      'API_URL_LOCAL',
    ]);
    assert.deepEqual(missingKeys(EXAMPLE, EXAMPLE), []);
  });
});

describe('switchTo and sync', () => {
  let dir;
  let paths;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'quezby-switch-'));
    mkdirSync(join(dir, 'ios/Config'), { recursive: true });
    writeFileSync(join(dir, '.env.example'), EXAMPLE);
    paths = pathsFor(dir);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('makes .env from the example the first time, then points everything at the environment', () => {
    const result = switchTo('staging', paths);

    assert.equal(result.created, true);
    assert.deepEqual(result.missing, []);
    assert.equal(parseEnv(readFileSync(paths.env, 'utf8')).get('QUEZBY_ENV'), 'staging');
    assert.match(readFileSync(paths.xcconfig, 'utf8'), /^QUEZBY_ENV = staging$/m);
  });

  it('leaves the rest of an existing .env as it was', () => {
    const mine = EXAMPLE.replace('GOOGLE_IOS_CLIENT_ID=', `GOOGLE_IOS_CLIENT_ID=${IOS_CLIENT}`);
    writeFileSync(paths.env, mine);

    const result = switchTo('production', paths);

    assert.equal(result.created, false);
    assert.equal(readFileSync(paths.env, 'utf8'), withEnvironment(mine, 'production'));
    assert.match(readFileSync(paths.xcconfig, 'utf8'), /com\.googleusercontent\.apps\.123456789012-/);
  });

  it('says which names an older .env lacks', () => {
    writeFileSync(paths.env, 'API_URL_LOCAL=http://localhost:8000\n');

    const { missing } = switchTo('local', paths);

    assert.ok(missing.includes('GOOGLE_WEB_CLIENT_ID'));
    assert.ok(!missing.includes('QUEZBY_ENV'));
  });

  it('refuses an environment that does not exist', () => {
    assert.throws(() => switchTo('prod', paths), /No environment "prod"/);
  });

  it('syncs iOS to .env as it stands, local when there is none', () => {
    assert.equal(sync(paths), 'local');
    assert.match(readFileSync(paths.xcconfig, 'utf8'), /^QUEZBY_ENV = local$/m);

    writeFileSync(paths.env, 'QUEZBY_ENV=staging\n');
    assert.equal(sync(paths), 'staging');
    assert.match(readFileSync(paths.xcconfig, 'utf8'), /^QUEZBY_DISPLAY_NAME = Quezby Staging$/m);
  });

  it('will not sync an environment nobody knows', () => {
    writeFileSync(paths.env, 'QUEZBY_ENV=prod\n');

    assert.throws(() => sync(paths), /QUEZBY_ENV=prod is none of local, staging, production/);
  });
});
