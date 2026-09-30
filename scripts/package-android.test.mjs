import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bundleName,
  iosBuildNumber,
  iosMarketingVersion,
  isDebugSigned,
  missingUploadKeys,
  nextVersionCode,
  nodeIsSupported,
  parseEnvironment,
  parseProperties,
  readVersion,
  requestedVersionCode,
  sha1Of,
  uploadSettings,
  withVersionCode,
} from './package-android.mjs';

const GRADLE = `android {
    defaultConfig {
        applicationId "com.kubisimsek.game.quezby"
        versionCode 1
        versionName "0.1.1"
    }
}
`;

describe('parseEnvironment', () => {
  it('builds for staging and production only', () => {
    assert.equal(parseEnvironment('staging'), 'staging');
    assert.equal(parseEnvironment('production'), 'production');
    assert.throws(() => parseEnvironment('local'), /usage/);
    assert.throws(() => parseEnvironment(undefined), /usage/);
  });
});

describe('requestedVersionCode', () => {
  it('reads --version-code, wherever pnpm puts it', () => {
    assert.equal(requestedVersionCode([]), null);
    assert.equal(requestedVersionCode(['--version-code', '12']), 12);
    assert.equal(requestedVersionCode(['--', '--version-code', '7']), 7);
    assert.throws(() => requestedVersionCode(['--version-code', 'x']), /whole number/);
    assert.throws(() => requestedVersionCode(['--version-code', '0']), /whole number/);
  });
});

describe('nodeIsSupported', () => {
  it('asks for Node 22', () => {
    assert.equal(nodeIsSupported('v22.17.0'), true);
    assert.equal(nodeIsSupported('v24.1.0'), true);
    assert.equal(nodeIsSupported('v20.19.4'), false);
  });
});

describe('the upload key', () => {
  it('reads gradle.properties the way Gradle does', () => {
    const values = parseProperties('# the key\nQUEZBY_UPLOAD_STORE_FILE=/Users/k/keys/up.jks\n! also a comment\nQUEZBY_UPLOAD_KEY_ALIAS: up\n\norg.gradle.jvmargs=-Xmx4g\n');
    assert.equal(values.get('QUEZBY_UPLOAD_STORE_FILE'), '/Users/k/keys/up.jks');
    assert.equal(values.get('QUEZBY_UPLOAD_KEY_ALIAS'), 'up');
    assert.equal(values.get('org.gradle.jvmargs'), '-Xmx4g');
    assert.equal(values.size, 3);
  });

  it('names what is missing, and lets ORG_GRADLE_PROJECT_* fill it in', () => {
    const text = 'QUEZBY_UPLOAD_STORE_FILE=/k.jks\nQUEZBY_UPLOAD_STORE_PASSWORD=\nQUEZBY_UPLOAD_KEY_ALIAS=up\n';
    assert.deepEqual(missingUploadKeys(uploadSettings(text, {})), ['QUEZBY_UPLOAD_STORE_PASSWORD', 'QUEZBY_UPLOAD_KEY_PASSWORD']);
    assert.deepEqual(
      missingUploadKeys(
        uploadSettings(text, {
          ORG_GRADLE_PROJECT_QUEZBY_UPLOAD_STORE_PASSWORD: 's',
          ORG_GRADLE_PROJECT_QUEZBY_UPLOAD_KEY_PASSWORD: 'k',
        }),
      ),
      [],
    );
    assert.equal(missingUploadKeys(uploadSettings('', {})).length, 4);
  });
});

describe('the version', () => {
  it('reads and raises versionCode in build.gradle, and nothing else', () => {
    assert.deepEqual(readVersion(GRADLE), { code: 1, name: '0.1.1' });
    const raised = withVersionCode(GRADLE, 5);
    assert.deepEqual(readVersion(raised), { code: 5, name: '0.1.1' });
    assert.equal(raised.replace('versionCode 5', 'versionCode 1'), GRADLE);
    assert.throws(() => readVersion('android {}'), /versionCode/);
  });

  it('reads the iOS build number and version from the Xcode project', () => {
    const pbxproj = 'CURRENT_PROJECT_VERSION = 4;\nMARKETING_VERSION = 0.1.1;\nCURRENT_PROJECT_VERSION = 3;\n';
    assert.equal(iosBuildNumber(pbxproj), 4);
    assert.equal(iosBuildNumber(''), 0);
    assert.equal(iosMarketingVersion(pbxproj), '0.1.1');
    assert.equal(iosMarketingVersion(''), null);
  });

  it('goes one past both platforms, or to the number asked for when it is higher', () => {
    assert.equal(nextVersionCode({ android: 1, ios: 4, requested: null }), 5);
    assert.equal(nextVersionCode({ android: 9, ios: 4, requested: null }), 10);
    assert.equal(nextVersionCode({ android: 1, ios: 4, requested: 12 }), 12);
    assert.throws(() => nextVersionCode({ android: 9, ios: 4, requested: 9 }), /above the current 9/);
  });
});

describe('the bundle', () => {
  it('is named after its environment, version and time', () => {
    assert.equal(
      bundleName('staging', '0.1.1', 5, new Date(2026, 8, 30, 10, 15, 3)),
      'quezby-android-staging-0.1.1-5-20260930-101503.aab',
    );
  });

  it('tells the upload key from the debug keystore', () => {
    const upload = 'Owner: CN=Kubilay, O=Quezby\nSHA1: 12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78\n';
    const debug = 'Owner: C=US, O=Android, CN=Android Debug\nSHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n';
    assert.equal(isDebugSigned(upload), false);
    assert.equal(isDebugSigned(debug), true);
    assert.equal(sha1Of(upload), '12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78');
    assert.equal(sha1Of('no certificate'), null);
  });
});
