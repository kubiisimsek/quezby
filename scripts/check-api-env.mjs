#!/usr/bin/env node
/**
 * Checks the `.env` an API zip will carry before `package-api.sh` builds it:
 *
 *   node scripts/check-api-env.mjs staging               # apps/api/.env.staging
 *   node scripts/check-api-env.mjs production path/.env  # any file
 *
 * An API without APP_KEY answers every player 500 (checkpoint receipts are
 * signed with it, Apple's refresh tokens encrypted with it), and one whose
 * APP_ENV is not its environment skips the guards that environment has — so
 * either refuses the build. Nothing a file holds is ever printed: a message
 * names the variable, never its value.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseEnv } from './switch-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ENVIRONMENTS = ['staging', 'production'];

/** The bytes Laravel's AES-256-CBC key is. */
const KEY_BYTES = 32;

/** What Laravel's `env()` reads as false, empty or null — everything else `(bool)` makes true. */
const OFF = ['', '0', 'false', '(false)', 'null', '(null)', 'empty', '(empty)'];

/** @returns {'staging' | 'production'} */
export function parseEnvironment(value) {
  if (ENVIRONMENTS.includes(value)) return value;
  throw new Error(`usage: check-api-env.mjs <${ENVIRONMENTS.join('|')}> [file]`);
}

/**
 * What is wrong with an APP_KEY, or null. Stricter than Laravel, which also
 * takes a raw 32-character key: `key:generate` only ever writes the
 * `base64:` form, so anything else is a paste gone wrong.
 *
 * @returns {'missing' | 'malformed' | null}
 */
export function appKeyProblem(value) {
  const key = (value ?? '').trim();
  if (key === '') return 'missing';
  if (!key.startsWith('base64:')) return 'malformed';
  const encoded = key.slice('base64:'.length);
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return 'malformed';
  return Buffer.from(encoded, 'base64').length === KEY_BYTES ? null : 'malformed';
}

/** Whether Laravel's `(bool) env('APP_DEBUG')` comes out true. */
export function debugIsOn(value) {
  return !OFF.includes((value ?? '').trim().toLowerCase());
}

/**
 * The problems of one `.env` text for an environment: `errors` refuse the
 * build, `warnings` do not.
 *
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkApiEnv(text, environment) {
  const values = parseEnv(text);
  const errors = [];
  const warnings = [];

  const keyProblem = appKeyProblem(values.get('APP_KEY'));
  if (keyProblem === 'missing') {
    errors.push(
      'APP_KEY is empty. Generate it once with (cd apps/api && php artisan key:generate --show), put the same line here and in the server\'s .env, and never change it again.',
    );
  } else if (keyProblem === 'malformed') {
    errors.push(
      `APP_KEY is not a key: it must be "base64:" and ${KEY_BYTES} bytes, as php artisan key:generate --show prints it.`,
    );
  }

  // Laravel's own default when the line is missing altogether.
  const appEnv = values.has('APP_ENV') ? values.get('APP_ENV') : 'production';
  if (appEnv !== environment) {
    errors.push(
      `APP_ENV is "${appEnv}", not "${environment}": the API would skip the guards ${environment} has.`,
    );
  }

  if (debugIsOn(values.get('APP_DEBUG'))) {
    errors.push(`APP_DEBUG is on: the API refuses to start in ${environment} until it is false.`);
  }

  if ((values.get('QUEZBY_DAILY_SECRET') ?? '').trim() === '') {
    warnings.push(
      'QUEZBY_DAILY_SECRET is empty, so the daily feed is seeded from APP_KEY. Give it its own secret before the first daily challenge.',
    );
  }

  // Email codes (sign-up, an attached email, a password reset) only reach anyone over SMTP.
  const mailer = (values.get('MAIL_MAILER') ?? '').trim();
  if (mailer !== 'smtp') {
    warnings.push(
      `MAIL_MAILER is "${mailer || 'unset'}", not smtp: no email code reaches anyone, so nobody can sign up with an email or reset a password.`,
    );
  } else {
    const empty = ['MAIL_HOST', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'].filter(
      (name) => (values.get(name) ?? '').trim() === '',
    );
    if (empty.length > 0) {
      warnings.push(`${empty.join(', ')} ${empty.length === 1 ? 'is' : 'are'} empty: email codes cannot be sent.`);
    }
  }

  return { errors, warnings };
}

/** A path as the repository names it, or as given when it lies outside. */
function shown(file) {
  const path = relative(root, file);
  return path && !path.startsWith('..') ? path : file;
}

function main(argv) {
  const environment = parseEnvironment(argv[0]);
  const file = argv[1] ?? join(root, `apps/api/.env.${environment}`);
  if (!existsSync(file)) throw new Error(`${shown(file)} not found.`);

  const { errors, warnings } = checkApiEnv(readFileSync(file, 'utf8'), environment);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length > 0) {
    throw new Error(`${shown(file)} is not ready for ${environment}:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }
  console.log(`✓ ${shown(file)} is ready for ${environment}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
