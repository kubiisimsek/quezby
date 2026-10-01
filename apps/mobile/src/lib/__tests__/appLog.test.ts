import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLogEntry } from '@quezby/types';

import {
  BATCH,
  MAX_KEPT,
  REPEAT_MS,
  hydrateAppLogs,
  logApp,
  logAppError,
  onAppLog,
  pendingAppLogs,
  resetAppLogs,
  sendAppLogs,
} from '@/lib/appLog';

const NOW = Date.parse('2026-10-01T09:00:00.000Z');

async function stored(): Promise<AppLogEntry[]> {
  return JSON.parse((await AsyncStorage.getItem('quezby.applogs.v1')) ?? '[]') as AppLogEntry[];
}

async function flushStorage() {
  for (let tick = 0; tick < 5; tick += 1) await Promise.resolve();
}

beforeEach(async () => {
  resetAppLogs();
  await AsyncStorage.clear();
});

describe('keeping a line', () => {
  it('keeps the level, the event, the message, the context and the phone’s time', async () => {
    await hydrateAppLogs();
    logApp('warning', 'api.unreachable', 'GET /me/inbox', { tries: 1 }, NOW);

    expect(pendingAppLogs()).toEqual([
      { level: 'warning', event: 'api.unreachable', message: 'GET /me/inbox', context: { tries: 1 }, at: '2026-10-01T09:00:00.000Z' },
    ]);
    await flushStorage();
    expect(await stored()).toHaveLength(1);
  });

  it('keeps the same line once in a while, and every different one', () => {
    logApp('warning', 'api.unreachable', 'GET /me/inbox', undefined, NOW);
    logApp('warning', 'api.unreachable', 'GET /me/inbox', undefined, NOW + 1_000);
    logApp('warning', 'api.unreachable', 'GET /me/pulse', undefined, NOW + 1_000);
    logApp('warning', 'api.unreachable', 'GET /me/inbox', undefined, NOW + REPEAT_MS);

    expect(pendingAppLogs().map((entry) => entry.message)).toEqual(['GET /me/inbox', 'GET /me/pulse', 'GET /me/inbox']);
  });

  it('keeps at most so many, the newest', () => {
    for (let index = 0; index < MAX_KEPT + 5; index += 1) logApp('info', 'a', `line ${index}`, undefined, NOW);

    expect(pendingAppLogs()).toHaveLength(MAX_KEPT);
    expect(pendingAppLogs()[0]?.message).toBe('line 5');
  });

  it('cuts long words, and keeps twenty context values', () => {
    const context = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`k${index}`, 'x'.repeat(400)]));
    logApp('info', 'a', 'm'.repeat(600), context, NOW);

    const [entry] = pendingAppLogs();
    expect(entry?.message).toHaveLength(500);
    expect(Object.keys(entry?.context ?? {})).toHaveLength(20);
    expect(entry?.context?.k0).toHaveLength(300);
  });

  it('reads an error’s message and Firebase’s code', () => {
    logAppError('push.token', Object.assign(new Error('unregistered'), { code: 'messaging/unregistered' }), { asked: true });
    logAppError('crash', 'just a string');

    expect(pendingAppLogs()).toEqual([
      expect.objectContaining({ level: 'error', event: 'push.token', message: 'unregistered', context: { code: 'messaging/unregistered', asked: true } }),
      expect.objectContaining({ event: 'crash', message: 'just a string' }),
    ]);
  });

  it('tells its listeners', () => {
    const listener = jest.fn();
    const stop = onAppLog(listener);
    logApp('info', 'a', 'b', undefined, NOW);
    stop();
    logApp('info', 'a', 'c', undefined, NOW);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reads what the last launch left, before what this one kept', async () => {
    await AsyncStorage.setItem('quezby.applogs.v1', JSON.stringify([{ level: 'error', event: 'crash', message: 'boom' }]));
    logApp('info', 'a', 'b', undefined, NOW);

    await hydrateAppLogs();

    expect(pendingAppLogs().map((entry) => entry.event)).toEqual(['crash', 'a']);
  });
});

describe('sending', () => {
  it('sends a batch at a time and forgets what was taken', async () => {
    await hydrateAppLogs();
    for (let index = 0; index < BATCH + 3; index += 1) logApp('info', 'a', `line ${index}`, undefined, NOW);
    const send = jest.fn(async (_entries: AppLogEntry[]) => undefined);

    await sendAppLogs(send);

    expect(send.mock.calls.map(([entries]) => entries.length)).toEqual([BATCH, 3]);
    expect(pendingAppLogs()).toEqual([]);
    await flushStorage();
    expect(await stored()).toEqual([]);
  });

  it('keeps what did not go for the next try, unless it never will', async () => {
    logApp('info', 'a', 'b', undefined, NOW);

    await sendAppLogs(jest.fn(async () => Promise.reject(new Error('offline'))));
    expect(pendingAppLogs()).toHaveLength(1);

    await sendAppLogs(jest.fn(async () => Promise.reject(new Error('422'))), () => false);
    expect(pendingAppLogs()).toEqual([]);
  });

  it('sends once at a time', async () => {
    logApp('info', 'a', 'b', undefined, NOW);
    let release: () => void = () => undefined;
    const send = jest.fn(() => new Promise<void>((resolve) => (release = resolve)));

    const first = sendAppLogs(send);
    const second = sendAppLogs(send);
    release();
    await Promise.all([first, second]);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
