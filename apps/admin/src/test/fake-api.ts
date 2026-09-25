import { createAdminClient, type AdminClient } from '@quezby/sdk/admin';
import { vi, type Mock } from 'vitest';

type Fake<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : Fake<T[K]>;
};

export type FakeApi = Fake<Omit<AdminClient, 'request'>> & { request: Mock };

function fake(node: object, path: string[]): object {
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      typeof value === 'function'
        ? vi.fn(() => Promise.reject(new Error(`fakeApi.${[...path, key].join('.')} was not stubbed`)))
        : fake(value as object, [...path, key]),
    ]),
  );
}

/**
 * The admin client with every method a `vi.fn()` — shaped from the real
 * client, so a renamed endpoint breaks the tests. A method the test did not
 * stub rejects with its own name.
 */
export function fakeApi(): FakeApi {
  return fake(createAdminClient({ baseUrl: 'http://fake' }), []) as FakeApi;
}

export function asClient(api: FakeApi): AdminClient {
  return api as unknown as AdminClient;
}
