import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256Hex } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import type { DeviceCheckResponse } from '@quezby/types';

import { api } from '@/api/client';
import { APP_PLATFORM, GOOGLE_CLOUD_PROJECT_NUMBER } from '@/config/env';
import { IntegrityError, appAttest, playIntegrity } from '@/lib/integrity';

/**
 * The phone vouching for itself against a one-time challenge from the API —
 * a Play Integrity token on Android, an App Attest attestation or assertion
 * on iOS. The API checks the proof and answers with the verdict it stored;
 * the phone only carries it there.
 *
 * Nothing here throws: whatever goes wrong, the verdict just stays unknown
 * and the caller learns whether asking again later can help.
 */
export type DeviceCheckOutcome =
  | ({ kind: 'checked' } & DeviceCheckResponse)
  /** This phone or build cannot vouch for itself; asking again will not help. */
  | { kind: 'unsupported' }
  /** Something on the way failed — the network, Google, Apple: ask again later. */
  | { kind: 'failed' };

export type DeviceCheckOptions = {
  platform: 'ios' | 'android';
  /** Android only: the Google Cloud project Play Integrity answers for. */
  cloudProjectNumber: string | null;
};

const DEFAULTS: DeviceCheckOptions = {
  platform: APP_PLATFORM,
  cloudProjectNumber: GOOGLE_CLOUD_PROJECT_NUMBER,
};

/**
 * Where the attested App Attest key id is kept: one key per install, gone
 * with it. The id names a key in this phone's Secure Enclave and is no secret.
 */
export const ATTEST_KEY = 'quezby.appattest.v1';

let running: { userId: string; done: Promise<DeviceCheckOutcome> } | null = null;

/**
 * Checks this phone for the signed-in player. One check at a time, app-wide:
 * App Attest counts every assertion, and two in flight could reach the API
 * out of order. A second caller for the same player shares the running
 * check; one for another player waits for it to end, then runs its own.
 */
export async function checkDevice(
  userId: string,
  options: DeviceCheckOptions = DEFAULTS,
): Promise<DeviceCheckOutcome> {
  while (running && running.userId !== userId) {
    await running.done;
  }
  if (running) return running.done;

  const done = attempt(options).finally(() => {
    if (running?.done === done) running = null;
  });
  running = { userId, done };
  return done;
}

async function attempt(options: DeviceCheckOptions): Promise<DeviceCheckOutcome> {
  try {
    const answer =
      options.platform === 'android'
        ? await android(options.cloudProjectNumber)
        : await ios();
    return answer ? { kind: 'checked', ...answer } : { kind: 'unsupported' };
  } catch (error) {
    return error instanceof IntegrityError && error.kind === 'unavailable'
      ? { kind: 'unsupported' }
      : { kind: 'failed' };
  }
}

/* ---------------------------------------------------------- android -- */

/**
 * A Play Integrity token bound to the challenge. The native module keeps the
 * prepared token provider, so preparing again costs nothing until Play says
 * the provider went stale — then it is prepared anew and asked once more.
 */
async function android(cloudProjectNumber: string | null): Promise<DeviceCheckResponse | null> {
  if (!cloudProjectNumber) return null;
  if (!(await playIntegrity.available())) return null;
  await playIntegrity.prepare(cloudProjectNumber);

  const { challenge } = await api.device.challenge();
  const requestHash = sha256Hex(challenge);
  let token: string;
  try {
    token = await playIntegrity.token(requestHash);
  } catch (error) {
    if (!(error instanceof IntegrityError && error.kind === 'provider_invalid')) throw error;
    await playIntegrity.prepare(cloudProjectNumber);
    token = await playIntegrity.token(requestHash);
  }
  return api.device.android({ challenge, token });
}

/* -------------------------------------------------------------- ios -- */

async function ios(): Promise<DeviceCheckResponse | null> {
  if (!(await appAttest.supported())) return null;

  const keyId = await storedKey();
  if (keyId) {
    const asserted = await assertWith(keyId);
    if (asserted) return asserted;
    await forgetKey();
  }
  return attestNewKey();
}

/** An assertion by the kept key — or null when that key is gone, here or at the API. */
async function assertWith(keyId: string): Promise<DeviceCheckResponse | null> {
  const { challenge } = await api.device.challenge();
  let assertion: string;
  try {
    assertion = await appAttest.assert(keyId, challenge);
  } catch (error) {
    if (error instanceof IntegrityError && error.kind === 'invalid_key') return null;
    throw error;
  }
  try {
    return await api.device.iosAssert({ challenge, keyId, assertion });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'attest_key_unknown') return null;
    throw error;
  }
}

/**
 * A new key, attested by Apple and checked by the API. It is kept only once
 * the API vouched for it: a key it refused would only be refused again.
 */
async function attestNewKey(): Promise<DeviceCheckResponse> {
  const keyId = await appAttest.generateKey();
  const { challenge } = await api.device.challenge();
  const attestation = await appAttest.attestKey(keyId, challenge);
  const answer = await api.device.iosAttest({ challenge, keyId, attestation });
  if (answer.verdict === 'pass') await keepKey(keyId);
  return answer;
}

async function storedKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ATTEST_KEY);
  } catch {
    return null;
  }
}

async function keepKey(keyId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ATTEST_KEY, keyId);
  } catch {
    // Not kept: the next check attests a new key.
  }
}

async function forgetKey(): Promise<void> {
  await AsyncStorage.removeItem(ATTEST_KEY).catch(() => undefined);
}
