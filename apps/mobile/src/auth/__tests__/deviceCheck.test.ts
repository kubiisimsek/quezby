import { sha256Hex } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';

import { api } from '@/api/client';
import { ATTEST_KEY_SERVICE, checkDevice } from '@/auth/deviceCheck';

jest.mock('@/api/client', () => ({
  api: {
    device: {
      challenge: jest.fn(),
      android: jest.fn(),
      iosAttest: jest.fn(),
      iosAssert: jest.fn(),
    },
  },
}));

const device = (api as unknown as {
  device: { challenge: jest.Mock; android: jest.Mock; iosAttest: jest.Mock; iosAssert: jest.Mock };
}).device;

const native = (NativeModules as { QuezbyIntegrity: Record<string, jest.Mock> }).QuezbyIntegrity;
const nativeMock = (name: string): jest.Mock => {
  const method = native[name];
  if (!method) throw new Error(`No native mock for ${name}.`);
  return method;
};

const ANDROID = { platform: 'android', cloudProjectNumber: '123456789012' } as const;
const IOS = { platform: 'ios', cloudProjectNumber: null } as const;

const PASS = { verdict: 'pass', validUntil: '2026-09-26T16:00:00.000Z', enforced: true } as const;
const FAIL = { verdict: 'fail', validUntil: '2026-09-26T22:00:00.000Z', enforced: true } as const;

/** The API's one-time challenges, in the order they are handed out. */
function challenges(...values: string[]) {
  for (const challenge of values) {
    device.challenge.mockResolvedValueOnce({ challenge, expiresAt: '2026-09-26T10:05:00.000Z' });
  }
}

function nativeError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

async function storedKey(): Promise<string | null> {
  const stored = await Keychain.getGenericPassword({ service: ATTEST_KEY_SERVICE });
  return stored ? stored.password : null;
}

describe('checkDevice', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await Keychain.resetGenericPassword({ service: ATTEST_KEY_SERVICE });
  });

  describe('on Android', () => {
    beforeEach(() => {
      nativeMock('isAvailable').mockResolvedValue(true);
      nativeMock('prepare').mockResolvedValue(undefined);
      nativeMock('request').mockResolvedValue('play-token');
    });

    afterEach(() => {
      nativeMock('isAvailable').mockResolvedValue(false);
    });

    it('asks Play Integrity for a token bound to the challenge’s hash and hands it to the API', async () => {
      challenges('challenge-1');
      device.android.mockResolvedValueOnce(PASS);

      const outcome = await checkDevice('player-1', ANDROID);

      expect(nativeMock('prepare')).toHaveBeenCalledWith('123456789012');
      expect(nativeMock('request')).toHaveBeenCalledWith(sha256Hex('challenge-1'));
      expect(device.android).toHaveBeenCalledWith({ challenge: 'challenge-1', token: 'play-token' });
      expect(outcome).toEqual({ kind: 'checked', ...PASS });
    });

    it('passes on the verdict the API gives a failing phone', async () => {
      challenges('challenge-1');
      device.android.mockResolvedValueOnce(FAIL);

      await expect(checkDevice('player-1', ANDROID)).resolves.toEqual({ kind: 'checked', ...FAIL });
    });

    it('prepares a stale token provider anew and asks once more', async () => {
      challenges('challenge-1');
      nativeMock('request')
        .mockRejectedValueOnce(nativeError('provider_invalid'))
        .mockResolvedValueOnce('fresh-token');
      device.android.mockResolvedValueOnce(PASS);

      const outcome = await checkDevice('player-1', ANDROID);

      expect(nativeMock('prepare')).toHaveBeenCalledTimes(2);
      expect(nativeMock('request')).toHaveBeenCalledTimes(2);
      expect(device.android).toHaveBeenCalledWith({ challenge: 'challenge-1', token: 'fresh-token' });
      expect(outcome.kind).toBe('checked');
    });

    it('asks nothing of a phone without Google Play services', async () => {
      nativeMock('isAvailable').mockResolvedValue(false);

      await expect(checkDevice('player-1', ANDROID)).resolves.toEqual({ kind: 'unsupported' });
      expect(nativeMock('prepare')).not.toHaveBeenCalled();
      expect(device.challenge).not.toHaveBeenCalled();
    });

    it('skips the check in a build without a Cloud project number', async () => {
      await expect(
        checkDevice('player-1', { platform: 'android', cloudProjectNumber: null }),
      ).resolves.toEqual({ kind: 'unsupported' });
      expect(nativeMock('isAvailable')).not.toHaveBeenCalled();
      expect(device.challenge).not.toHaveBeenCalled();
    });

    it('counts a phone Play cannot serve as one that cannot check', async () => {
      nativeMock('prepare').mockRejectedValueOnce(nativeError('play_store_not_found'));

      await expect(checkDevice('player-1', ANDROID)).resolves.toEqual({ kind: 'unsupported' });
      expect(device.challenge).not.toHaveBeenCalled();
    });

    it('fails silently when Google cannot be reached, to try again later', async () => {
      challenges('challenge-1');
      nativeMock('request').mockRejectedValueOnce(nativeError('network_error'));

      await expect(checkDevice('player-1', ANDROID)).resolves.toEqual({ kind: 'failed' });
      expect(device.android).not.toHaveBeenCalled();
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      nativeMock('isSupported').mockResolvedValue(true);
      nativeMock('generateKey').mockResolvedValue('key-1');
      nativeMock('attestKey').mockResolvedValue('attestation-1');
      nativeMock('generateAssertion').mockResolvedValue('assertion-1');
    });

    afterEach(() => {
      nativeMock('isSupported').mockResolvedValue(false);
    });

    it('attests a new key the first time, and keeps it once the API vouched for it', async () => {
      challenges('challenge-1');
      device.iosAttest.mockResolvedValueOnce(PASS);

      const outcome = await checkDevice('player-1', IOS);

      expect(nativeMock('attestKey')).toHaveBeenCalledWith('key-1', 'challenge-1');
      expect(device.iosAttest).toHaveBeenCalledWith({
        challenge: 'challenge-1',
        keyId: 'key-1',
        attestation: 'attestation-1',
      });
      expect(outcome).toEqual({ kind: 'checked', ...PASS });
      await expect(storedKey()).resolves.toBe('key-1');
    });

    it('asserts with the kept key after that', async () => {
      await Keychain.setGenericPassword('appattest', 'key-1', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-2');
      device.iosAssert.mockResolvedValueOnce(PASS);

      const outcome = await checkDevice('player-1', IOS);

      expect(nativeMock('generateAssertion')).toHaveBeenCalledWith('key-1', 'challenge-2');
      expect(device.iosAssert).toHaveBeenCalledWith({
        challenge: 'challenge-2',
        keyId: 'key-1',
        assertion: 'assertion-1',
      });
      expect(nativeMock('generateKey')).not.toHaveBeenCalled();
      expect(outcome).toEqual({ kind: 'checked', ...PASS });
    });

    it('drops a key the API does not know and attests a new one', async () => {
      await Keychain.setGenericPassword('appattest', 'old-key', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-1', 'challenge-2');
      device.iosAssert.mockRejectedValueOnce(new ApiError(409, 'attest_key_unknown', 'x'));
      nativeMock('generateKey').mockResolvedValueOnce('new-key');
      device.iosAttest.mockResolvedValueOnce(PASS);

      const outcome = await checkDevice('player-1', IOS);

      expect(nativeMock('generateAssertion')).toHaveBeenCalledWith('old-key', 'challenge-1');
      expect(nativeMock('attestKey')).toHaveBeenCalledWith('new-key', 'challenge-2');
      expect(outcome).toEqual({ kind: 'checked', ...PASS });
      await expect(storedKey()).resolves.toBe('new-key');
    });

    it('forgets a key the API does not know even when the new one cannot be attested yet', async () => {
      await Keychain.setGenericPassword('appattest', 'old-key', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-1');
      device.iosAssert.mockRejectedValueOnce(new ApiError(409, 'attest_key_unknown', 'x'));
      device.challenge.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'failed' });
      await expect(storedKey()).resolves.toBeNull();
    });

    it('attests a new key when the kept one is gone from the phone (a reinstall)', async () => {
      await Keychain.setGenericPassword('appattest', 'old-key', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-1', 'challenge-2');
      nativeMock('generateAssertion').mockRejectedValueOnce(nativeError('invalid_key'));
      nativeMock('generateKey').mockResolvedValueOnce('new-key');
      device.iosAttest.mockResolvedValueOnce(PASS);

      await expect(checkDevice('player-1', IOS)).resolves.toMatchObject({ kind: 'checked' });
      expect(device.iosAssert).not.toHaveBeenCalled();
      await expect(storedKey()).resolves.toBe('new-key');
    });

    it('does not keep a key the API refused', async () => {
      challenges('challenge-1');
      device.iosAttest.mockResolvedValueOnce(FAIL);

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'checked', ...FAIL });
      await expect(storedKey()).resolves.toBeNull();
    });

    it('asks nothing where App Attest does not run (the simulator)', async () => {
      nativeMock('isSupported').mockResolvedValue(false);

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'unsupported' });
      expect(device.challenge).not.toHaveBeenCalled();
    });

    it('fails silently when the API cannot be reached, keeping the key', async () => {
      await Keychain.setGenericPassword('appattest', 'key-1', { service: ATTEST_KEY_SERVICE });
      device.challenge.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'failed' });
      await expect(storedKey()).resolves.toBe('key-1');
    });

    it('fails silently when Apple cannot attest right now', async () => {
      challenges('challenge-1');
      nativeMock('attestKey').mockRejectedValueOnce(nativeError('server_unavailable'));

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'failed' });
      expect(device.iosAttest).not.toHaveBeenCalled();
    });

    it('fails silently when the API refuses the proof', async () => {
      challenges('challenge-1');
      device.iosAttest.mockRejectedValueOnce(new ApiError(422, 'challenge_invalid', 'x'));

      await expect(checkDevice('player-1', IOS)).resolves.toEqual({ kind: 'failed' });
      await expect(storedKey()).resolves.toBeNull();
    });
  });

  describe('one check at a time', () => {
    beforeEach(() => {
      nativeMock('isSupported').mockResolvedValue(true);
      nativeMock('generateAssertion').mockResolvedValue('assertion-1');
    });

    afterEach(() => {
      nativeMock('isSupported').mockResolvedValue(false);
    });

    it('lets a second caller for the same player share the running check', async () => {
      await Keychain.setGenericPassword('appattest', 'key-1', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-1');
      device.iosAssert.mockResolvedValueOnce(PASS);

      const [first, second] = await Promise.all([
        checkDevice('player-1', IOS),
        checkDevice('player-1', IOS),
      ]);

      expect(first).toEqual(second);
      expect(device.challenge).toHaveBeenCalledTimes(1);
      expect(nativeMock('generateAssertion')).toHaveBeenCalledTimes(1);
    });

    it('runs another player’s check only after the running one', async () => {
      await Keychain.setGenericPassword('appattest', 'key-1', { service: ATTEST_KEY_SERVICE });
      challenges('challenge-1', 'challenge-2');
      device.iosAssert.mockResolvedValueOnce(PASS).mockResolvedValueOnce(FAIL);

      const [first, second] = await Promise.all([
        checkDevice('player-1', IOS),
        checkDevice('player-2', IOS),
      ]);

      expect(first).toEqual({ kind: 'checked', ...PASS });
      expect(second).toEqual({ kind: 'checked', ...FAIL });
      expect(nativeMock('generateAssertion').mock.calls).toEqual([
        ['key-1', 'challenge-1'],
        ['key-1', 'challenge-2'],
      ]);
    });
  });
});
