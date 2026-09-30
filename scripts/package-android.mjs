#!/usr/bin/env node
/**
 * Builds the Android app bundle Google Play takes, signed with the upload key:
 *
 *   pnpm android:bundle:staging      # → talks to the staging API ("Quezby Staging")
 *   pnpm android:bundle:production   # → talks to the production API ("Quezby")
 *
 *   pnpm android:bundle:staging -- --version-code 12   # a build number of your own
 *
 * → dist-deploy/quezby-android-<env>-<versionName>-<versionCode>-<timestamp>.aab,
 * for Play Console → Test and release → Internal testing (or a production
 * release). What it does, in order:
 *
 *   1. refuses without Node 22 or without the upload key named in
 *      ~/.gradle/gradle.properties (QUEZBY_UPLOAD_*) — a bundle signed with the
 *      debug keystore is one Play turns down;
 *   2. raises `versionCode` in apps/mobile/android/app/build.gradle past both
 *      Android's and iOS's (CURRENT_PROJECT_VERSION): the two share one build
 *      number sequence (docs/development/environments.md);
 *   3. points apps/mobile/.env at the environment, typechecks the app and runs
 *      `./gradlew bundleRelease`;
 *   4. checks the bundle is signed with the upload key, not the debug one;
 *   5. copies it into dist-deploy/ and puts .env back where it was.
 *
 * The keystore and its passwords never leave ~/.gradle/gradle.properties;
 * nothing here prints them.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseEnv, pathsFor, switchTo } from './switch-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = join(root, 'apps/mobile');
const ANDROID = join(MOBILE, 'android');
const GRADLE_FILE = join(ANDROID, 'app/build.gradle');
const PBXPROJ = join(MOBILE, 'ios/Quezby.xcodeproj/project.pbxproj');
const BUNDLE = join(ANDROID, 'app/build/outputs/bundle/release/app-release.aab');
const OUT = join(root, 'dist-deploy');

export const ENVIRONMENTS = ['staging', 'production'];

/** What names the upload key; all four must be there. */
export const UPLOAD_KEYS = [
  'QUEZBY_UPLOAD_STORE_FILE',
  'QUEZBY_UPLOAD_STORE_PASSWORD',
  'QUEZBY_UPLOAD_KEY_ALIAS',
  'QUEZBY_UPLOAD_KEY_PASSWORD',
];

/** @returns {'staging' | 'production'} */
export function parseEnvironment(value) {
  if (ENVIRONMENTS.includes(value)) return value;
  throw new Error(`usage: package-android.mjs <${ENVIRONMENTS.join('|')}> [--version-code N]`);
}

/** `--version-code N` from the arguments; null when not given. */
export function requestedVersionCode(args) {
  const at = args.indexOf('--version-code');
  if (at === -1) return null;
  const value = Number(args[at + 1]);
  if (!Number.isInteger(value) || value < 1) throw new Error('--version-code takes a whole number above 0');
  return value;
}

/** The mobile tooling runs on Node 22 (.nvmrc); the Gradle build bundles the JavaScript with it. */
export function nodeIsSupported(version) {
  return Number(String(version).replace(/^v/, '').split('.')[0]) >= 22;
}

/** `key=value` (or `key: value`) lines as Gradle reads a properties file; `#` and `!` start a comment. */
export function parseProperties(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const match = trimmed.match(/^([^=:\s]+)\s*[=:]\s*(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

/**
 * The upload key's settings as Gradle sees them: ~/.gradle/gradle.properties,
 * overridden by ORG_GRADLE_PROJECT_* variables, as Gradle does.
 */
export function uploadSettings(propertiesText, env) {
  const values = parseProperties(propertiesText);
  for (const key of UPLOAD_KEYS) {
    const fromEnv = env[`ORG_GRADLE_PROJECT_${key}`];
    if (fromEnv) values.set(key, fromEnv);
  }
  return values;
}

/** Which of the upload key's four settings are missing or empty. */
export function missingUploadKeys(values) {
  return UPLOAD_KEYS.filter((key) => !values.get(key));
}

/** The app's version in build.gradle: `versionCode` and `versionName`. */
export function readVersion(gradleText) {
  const code = gradleText.match(/^\s*versionCode\s+(\d+)\s*$/m);
  const name = gradleText.match(/^\s*versionName\s+"([^"]+)"\s*$/m);
  if (!code || !name) throw new Error('build.gradle has no versionCode / versionName line');
  return { code: Number(code[1]), name: name[1] };
}

/** build.gradle with `versionCode` set to `code`. */
export function withVersionCode(gradleText, code) {
  return gradleText.replace(/^(\s*versionCode\s+)\d+(\s*)$/m, `$1${code}$2`);
}

/** The highest iOS build number (CURRENT_PROJECT_VERSION) in the Xcode project; 0 without one. */
export function iosBuildNumber(pbxprojText) {
  const numbers = [...pbxprojText.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((match) => Number(match[1]));
  return numbers.length === 0 ? 0 : Math.max(...numbers);
}

/** The iOS marketing version, when the project has one. */
export function iosMarketingVersion(pbxprojText) {
  return pbxprojText.match(/MARKETING_VERSION = ([^;]+);/)?.[1].trim() ?? null;
}

/**
 * The next build's versionCode: the one asked for, or one past both Android's
 * and iOS's current number — never one Play has seen.
 */
export function nextVersionCode({ android, ios, requested }) {
  if (requested !== null) {
    if (requested <= android) throw new Error(`--version-code ${requested} must be above the current ${android}`);
    return requested;
  }
  return Math.max(android, ios) + 1;
}

/** `quezby-android-staging-0.1.1-5-20260930-101503.aab`, in local time like the other packages. */
export function bundleName(environment, versionName, versionCode, now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `quezby-android-${environment}-${versionName}-${versionCode}-${stamp}.aab`;
}

/** Whether `keytool -printcert` output is the debug keystore's certificate. */
export function isDebugSigned(printcert) {
  return /CN=Android Debug/i.test(printcert);
}

/** The SHA-1 fingerprint in `keytool -printcert` output; null without one. */
export function sha1Of(printcert) {
  return printcert.match(/SHA1:\s*([0-9A-F:]{59})/i)?.[1] ?? null;
}

function step(message) {
  console.log(`→ ${message}`);
}

function sh(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function main(argv) {
  const environment = parseEnvironment(argv[0]);
  const requested = requestedVersionCode(argv.slice(1));

  if (!nodeIsSupported(process.version)) {
    throw new Error(`Node ${process.version}: the app builds on Node 22 — run \`source ~/.nvm/nvm.sh && nvm use\` first`);
  }

  const gradleHome = process.env.GRADLE_USER_HOME || join(homedir(), '.gradle');
  const propertiesFile = join(gradleHome, 'gradle.properties');
  const upload = uploadSettings(existsSync(propertiesFile) ? readFileSync(propertiesFile, 'utf8') : '', process.env);
  const missing = missingUploadKeys(upload);
  if (missing.length > 0) {
    throw new Error(
      `${propertiesFile} does not name the upload key (${missing.join(', ')}): the bundle would be signed with the debug keystore and Play refuses it. ` +
        'See docs/development/device-integrity-setup.md.',
    );
  }
  const storeFile = upload.get('QUEZBY_UPLOAD_STORE_FILE');
  if (!existsSync(storeFile)) throw new Error(`the upload keystore is not at ${storeFile}`);

  const gradleText = readFileSync(GRADLE_FILE, 'utf8');
  const pbxproj = existsSync(PBXPROJ) ? readFileSync(PBXPROJ, 'utf8') : '';
  const version = readVersion(gradleText);
  const code = nextVersionCode({ android: version.code, ios: iosBuildNumber(pbxproj), requested });
  const marketing = iosMarketingVersion(pbxproj);
  if (marketing !== null && marketing !== version.name) {
    console.warn(`! versionName ${version.name} differs from iOS MARKETING_VERSION ${marketing}`);
  }

  const paths = pathsFor(MOBILE);
  const before = existsSync(paths.env) ? parseEnv(readFileSync(paths.env, 'utf8')).get('QUEZBY_ENV') || null : null;

  step(`versionCode ${version.code} → ${code} (versionName ${version.name})`);
  writeFileSync(GRADLE_FILE, withVersionCode(gradleText, code));

  try {
    step(`Pointing the app at ${environment}`);
    switchTo(environment, paths);
    step('Typechecking the app');
    sh('pnpm', ['--filter', '@quezby/mobile', 'typecheck']);
    step('Building the release bundle (./gradlew bundleRelease)');
    sh('./gradlew', ['bundleRelease'], ANDROID);
  } finally {
    if (before !== null && before !== environment) {
      step(`Putting apps/mobile/.env back on ${before}`);
      switchTo(before, paths);
    }
  }

  if (!existsSync(BUNDLE)) throw new Error(`the build left no bundle at ${BUNDLE}`);

  let sha1 = null;
  try {
    const printcert = execFileSync('keytool', ['-printcert', '-jarfile', BUNDLE], { encoding: 'utf8' });
    if (isDebugSigned(printcert)) throw new Error('the bundle is signed with the debug keystore; Play would refuse it');
    sha1 = sha1Of(printcert);
  } catch (error) {
    if (error instanceof Error && error.message.includes('debug keystore')) throw error;
    console.warn('! keytool could not read the signature; check it with `keytool -printcert -jarfile` before uploading');
  }

  mkdirSync(OUT, { recursive: true });
  const name = bundleName(environment, version.name, code);
  copyFileSync(BUNDLE, join(OUT, name));

  console.log(`\n✓ dist-deploy/${name}`);
  console.log(`  versionName ${version.name} · versionCode ${code} · ${environment}`);
  if (sha1) console.log(`  Signed by the upload key, SHA-1 ${sha1} — Play Console → App integrity shows the same.`);
  console.log('  Upload it in Play Console → Test and release → Internal testing (or Production) → Create new release.');
  console.log(`  build.gradle now says versionCode ${code}: commit it, and give the next iOS archive a build number above ${code}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
