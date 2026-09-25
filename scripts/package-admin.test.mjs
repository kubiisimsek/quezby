import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { archiveName, envFilesFor, forbiddenVariables, missingFiles, parseEnvironment } from './package-admin.mjs';

describe('parseEnvironment', () => {
  it('builds for staging and production only', () => {
    assert.equal(parseEnvironment('staging'), 'staging');
    assert.equal(parseEnvironment('production'), 'production');
    assert.throws(() => parseEnvironment('local'), /usage/);
    assert.throws(() => parseEnvironment(undefined), /usage/);
  });
});

describe('archiveName', () => {
  it('stamps the zip like the API\'s', () => {
    assert.equal(archiveName('staging', new Date(2026, 8, 25, 14, 5, 3)), 'quezby-admin-staging-20260925-140503.zip');
  });
});

describe('envFilesFor', () => {
  it('reads what Vite reads for the mode', () => {
    assert.deepEqual(envFilesFor('production'), ['.env', '.env.local', '.env.production', '.env.production.local']);
  });
});

describe('forbiddenVariables', () => {
  it('lets the API origin through and nothing else', () => {
    assert.deepEqual(forbiddenVariables(['VITE_API_ORIGIN=https://api.quezby.com']), []);
    assert.deepEqual(
      forbiddenVariables(['VITE_API_ORIGIN=\nVITE_OPS_TOKEN=abc123 # oops', 'export VITE_SECRET="x"', 'OPS_TOKEN=server-side-only']),
      ['VITE_OPS_TOKEN', 'VITE_SECRET'],
    );
  });

  it('ignores a variable left empty', () => {
    assert.deepEqual(forbiddenVariables(['VITE_OPS_TOKEN=', "VITE_OTHER=''", 'VITE_THIRD=  # nothing']), []);
  });
});

describe('missingFiles', () => {
  it('names what a build lacks', () => {
    const dist = mkdtempSync(join(tmpdir(), 'quezby-admin-'));
    try {
      assert.deepEqual(missingFiles(dist), ['index.html', '.htaccess']);
      writeFileSync(join(dist, 'index.html'), '<!doctype html>');
      writeFileSync(join(dist, '.htaccess'), 'Options -Indexes');
      assert.deepEqual(missingFiles(dist), []);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
