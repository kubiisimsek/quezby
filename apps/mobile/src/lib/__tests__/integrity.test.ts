import { NativeModules } from 'react-native';

import { IntegrityError, appAttest, playIntegrity } from '@/lib/integrity';

type Native = Record<string, jest.Mock>;

const modules = NativeModules as { QuezbyIntegrity?: Native };
const installed = modules.QuezbyIntegrity as Native;

/** A native rejection as React Native delivers it: an Error with the module's code. */
function nativeError(code?: string): Error {
  return Object.assign(new Error('native failure'), code ? { code } : {});
}

async function failure(promise: Promise<unknown>): Promise<IntegrityError> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  if (!(error instanceof IntegrityError)) throw new Error('Expected an IntegrityError.');
  return error;
}

describe('the integrity module wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modules.QuezbyIntegrity = installed;
  });

  afterAll(() => {
    modules.QuezbyIntegrity = installed;
  });

  describe('Play Integrity', () => {
    it('asks whether Google Play services are on the phone', async () => {
      installed.isAvailable?.mockResolvedValueOnce(true);
      await expect(playIntegrity.available()).resolves.toBe(true);

      installed.isAvailable?.mockResolvedValueOnce(false);
      await expect(playIntegrity.available()).resolves.toBe(false);
    });

    it('prepares the provider for the project and returns the token for a hash', async () => {
      installed.request?.mockResolvedValueOnce('token-1');

      await playIntegrity.prepare('123456789012');
      await expect(playIntegrity.token('ab'.repeat(32))).resolves.toBe('token-1');

      expect(installed.prepare).toHaveBeenCalledWith('123456789012');
      expect(installed.request).toHaveBeenCalledWith('ab'.repeat(32));
    });

    it.each([
      ['play_services_not_found', 'unavailable'],
      ['play_store_not_found', 'unavailable'],
      ['api_not_available', 'unavailable'],
      ['play_store_outdated', 'unavailable'],
      ['cloud_project_invalid', 'unavailable'],
      ['provider_invalid', 'provider_invalid'],
      ['not_prepared', 'provider_invalid'],
      ['network_error', 'failed'],
      ['too_many_requests', 'failed'],
      ['google_server_unavailable', 'failed'],
    ])('names a %s rejection %s', async (code, kind) => {
      installed.request?.mockRejectedValueOnce(nativeError(code));

      const error = await failure(playIntegrity.token('hash'));

      expect(error.kind).toBe(kind);
      expect(error.code).toBe(code);
    });

    it('treats a rejection without a code as a failure to retry', async () => {
      installed.prepare?.mockRejectedValueOnce(nativeError());

      const error = await failure(playIntegrity.prepare('1'));

      expect(error).toMatchObject({ kind: 'failed', code: 'unknown' });
    });

    it('says no, rather than failing, when the question itself fails', async () => {
      installed.isAvailable?.mockRejectedValueOnce(nativeError('internal_error'));

      await expect(playIntegrity.available()).resolves.toBe(false);
    });
  });

  describe('App Attest', () => {
    it('asks whether this device can attest', async () => {
      installed.isSupported?.mockResolvedValueOnce(true);

      await expect(appAttest.supported()).resolves.toBe(true);
    });

    it('generates a key, attests it and asserts with it over the challenge', async () => {
      installed.generateKey?.mockResolvedValueOnce('key-1');
      installed.attestKey?.mockResolvedValueOnce('attestation-1');
      installed.generateAssertion?.mockResolvedValueOnce('assertion-1');

      await expect(appAttest.generateKey()).resolves.toBe('key-1');
      await expect(appAttest.attestKey('key-1', 'challenge-1')).resolves.toBe('attestation-1');
      await expect(appAttest.assert('key-1', 'challenge-2')).resolves.toBe('assertion-1');

      expect(installed.attestKey).toHaveBeenCalledWith('key-1', 'challenge-1');
      expect(installed.generateAssertion).toHaveBeenCalledWith('key-1', 'challenge-2');
    });

    it.each([
      ['invalid_key', 'invalid_key'],
      ['unsupported', 'unavailable'],
      ['server_unavailable', 'failed'],
      ['invalid_input', 'failed'],
    ])('names a %s rejection %s', async (code, kind) => {
      installed.generateAssertion?.mockRejectedValueOnce(nativeError(code));

      const error = await failure(appAttest.assert('key-1', 'challenge'));

      expect(error.kind).toBe(kind);
    });
  });

  describe('without the native module', () => {
    it('answers no to both platforms’ questions', async () => {
      modules.QuezbyIntegrity = undefined;

      await expect(playIntegrity.available()).resolves.toBe(false);
      await expect(appAttest.supported()).resolves.toBe(false);
    });

    it('fails every call as unavailable', async () => {
      modules.QuezbyIntegrity = undefined;

      await expect(failure(playIntegrity.prepare('1'))).resolves.toMatchObject({
        kind: 'unavailable',
        code: 'module_missing',
      });
      await expect(failure(appAttest.generateKey())).resolves.toMatchObject({
        kind: 'unavailable',
      });
    });

    it('treats the other platform’s module — without this method — as unavailable', async () => {
      const { isAvailable: _isAvailable, prepare: _prepare, request: _request, ...ios } = installed;
      modules.QuezbyIntegrity = ios;

      await expect(playIntegrity.available()).resolves.toBe(false);
      await expect(failure(playIntegrity.token('hash'))).resolves.toMatchObject({
        kind: 'unavailable',
      });
    });
  });
});
