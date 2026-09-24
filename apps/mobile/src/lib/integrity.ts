import { NativeModules } from 'react-native';

/**
 * The phone's word on itself, from the app's own native module
 * `QuezbyIntegrity`: Google Play Integrity (standard requests) on Android —
 * `android/app/src/main/java/com/kubisimsek/game/quezby/integrity` — and
 * Apple's App Attest on iOS — `ios/Quezby/QuezbyIntegrity.m`.
 *
 * Nothing here decides anything: it only fetches a proof for the API to
 * check. A build or phone that cannot give one — no module, no Google Play
 * services, no App Attest (the simulator) — answers "unavailable"; every
 * native failure arrives as an `IntegrityError`, never a raw one.
 */

type NativeIntegrity = {
  /* Android */
  isAvailable?: () => Promise<boolean>;
  prepare?: (cloudProjectNumber: string) => Promise<void>;
  request?: (requestHash: string) => Promise<string>;
  /* iOS */
  isSupported?: () => Promise<boolean>;
  generateKey?: () => Promise<string>;
  attestKey?: (keyId: string, challenge: string) => Promise<string>;
  generateAssertion?: (keyId: string, challenge: string) => Promise<string>;
};

/** What a failed native call means for the device check. */
export type IntegrityErrorKind =
  /** This phone or build cannot vouch for itself: no module, no Play services, no App Attest. */
  | 'unavailable'
  /** Android: the prepared token provider went stale — prepare it again. */
  | 'provider_invalid'
  /** iOS: the App Attest key is gone (a reinstall, a restored backup) — attest a new one. */
  | 'invalid_key'
  /** Anything else — the network, Google, Apple: try again later. */
  | 'failed';

export class IntegrityError extends Error {
  constructor(
    readonly kind: IntegrityErrorKind,
    /** The native reject code, e.g. `play_services_not_found`. */
    readonly code: string,
  ) {
    super(`Device integrity: ${code}`);
    this.name = 'IntegrityError';
  }
}

/**
 * The reject codes the native module uses (Play Integrity's
 * `StandardIntegrityErrorCode`, Apple's `DCError`), by what they mean here.
 * Any other code is `failed`.
 */
const KIND_OF: Readonly<Record<string, IntegrityErrorKind>> = {
  module_missing: 'unavailable',
  api_not_available: 'unavailable',
  play_store_not_found: 'unavailable',
  play_services_not_found: 'unavailable',
  play_store_outdated: 'unavailable',
  play_services_outdated: 'unavailable',
  app_not_installed: 'unavailable',
  app_uid_mismatch: 'unavailable',
  cloud_project_invalid: 'unavailable',
  provider_invalid: 'provider_invalid',
  not_prepared: 'provider_invalid',
  unsupported: 'unavailable',
  invalid_key: 'invalid_key',
};

function nativeModule(): NativeIntegrity | null {
  const modules = NativeModules as { QuezbyIntegrity?: NativeIntegrity | null };
  return modules.QuezbyIntegrity ?? null;
}

function codeOf(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.length > 0 ? code : 'unknown';
}

/** One native call, with a missing module or method as `unavailable`. */
async function call<T>(
  pick: (module: NativeIntegrity) => Promise<T> | undefined,
): Promise<T> {
  const module = nativeModule();
  let pending: Promise<T> | undefined;
  try {
    pending = module ? pick(module) : undefined;
  } catch (error) {
    pending = Promise.reject(error);
  }
  if (!pending) throw new IntegrityError('unavailable', 'module_missing');
  try {
    return await pending;
  } catch (error) {
    const code = codeOf(error);
    throw new IntegrityError(KIND_OF[code] ?? 'failed', code);
  }
}

/** A yes/no question: no module, no method or an error is a no. */
async function ask(
  pick: (module: NativeIntegrity) => Promise<boolean> | undefined,
): Promise<boolean> {
  try {
    return (await call(pick)) === true;
  } catch {
    return false;
  }
}

/** Android — Google Play Integrity, standard requests. */
export const playIntegrity = {
  /** Google Play services are on this phone, so a token can be asked for. */
  available: (): Promise<boolean> => ask((module) => module.isAvailable?.()),
  /** Warms up a token provider for the project; kept natively until it goes stale. */
  prepare: (cloudProjectNumber: string): Promise<void> =>
    call((module) => module.prepare?.(cloudProjectNumber)),
  /** A token bound to `requestHash` — the lower-case hex SHA-256 of the API's challenge. */
  token: (requestHash: string): Promise<string> =>
    call((module) => module.request?.(requestHash)),
};

/** iOS — App Attest. The challenge's SHA-256 is taken natively. */
export const appAttest = {
  /** A real device with App Attest; never the simulator. */
  supported: (): Promise<boolean> => ask((module) => module.isSupported?.()),
  /** A new key pair in the Secure Enclave; its id, base64. */
  generateKey: (): Promise<string> => call((module) => module.generateKey?.()),
  /** Apple's attestation (base64 CBOR) of the key over the challenge. */
  attestKey: (keyId: string, challenge: string): Promise<string> =>
    call((module) => module.attestKey?.(keyId, challenge)),
  /** An assertion (base64 CBOR) by an attested key over the challenge. */
  assert: (keyId: string, challenge: string): Promise<string> =>
    call((module) => module.generateAssertion?.(keyId, challenge)),
};
