import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLogEntry, LogLevel } from '@quezby/types';

/**
 * Errors the app would otherwise swallow — a push token Firebase would not
 * give, a request that never reached the API, a crash — kept on the phone
 * until a signed-in player can send them (`useAppLogs`, `POST /me/logs`) and
 * read on the admin panel's Loglar page. The same event and message are kept
 * once in `REPEAT_MS`; past `MAX_KEPT` the oldest go. Never a token, a
 * password or anything the player typed: the API hides such keys anyway.
 */

const KEY = 'quezby.applogs.v1';

/** What waits on the phone at most; the oldest go first. */
export const MAX_KEPT = 50;

/** What one `POST /me/logs` carries at most (`quezby.logs.app_batch`). */
export const BATCH = 20;

/** The same event and message are kept once in this long. */
export const REPEAT_MS = 10 * 60_000;

type Context = NonNullable<AppLogEntry['context']>;

let queue: AppLogEntry[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
let sending: Promise<void> | null = null;
const lastSeen = new Map<string, number>();
const listeners = new Set<() => void>();

function save(): void {
  // Before the last launch's lines are read, writing would throw them away; `hydrateAppLogs` saves both.
  if (!hydrated) return;
  void AsyncStorage.setItem(KEY, JSON.stringify(queue)).catch(() => undefined);
}

function cut(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** Keeps a line for the Loglar page; nothing when the same one was kept a moment ago. */
export function logApp(level: LogLevel, event: string, message: string, context?: Context, now = Date.now()): void {
  const key = `${event}\u0000${message}`;
  const seen = lastSeen.get(key);
  if (seen !== undefined && now - seen < REPEAT_MS) return;
  lastSeen.set(key, now);

  const entry: AppLogEntry = { level, event, message: cut(message || event, 500), at: new Date(now).toISOString() };
  if (context && Object.keys(context).length > 0) {
    entry.context = Object.fromEntries(
      Object.entries(context)
        .slice(0, 20)
        .map(([name, value]) => [name, typeof value === 'string' ? cut(value, 300) : value]),
    );
  }
  queue = [...queue, entry].slice(-MAX_KEPT);
  save();
  listeners.forEach((listener) => listener());
}

/** An error, by what it says of itself: its message, and Firebase's `code` when it has one. */
export function logAppError(event: string, error: unknown, context: Context = {}): void {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  const code = typeof (error as { code?: unknown } | null)?.code === 'string' ? (error as { code: string }).code : undefined;
  logApp('error', event, message, code ? { code, ...context } : context);
}

/** What the last launch left unsent. */
export function hydrateAppLogs(): Promise<void> {
  hydrating ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(stored)) queue = [...(stored as AppLogEntry[]), ...queue].slice(-MAX_KEPT);
    } catch {
      // An unreadable leftover is no reason to keep anything.
    }
    hydrated = true;
    save();
  })();
  return hydrating;
}

/**
 * Sends what waits, a batch at a time. `send` throwing keeps the batch for
 * the next try — unless `keep` says it never will be taken.
 */
export function sendAppLogs(
  send: (entries: AppLogEntry[]) => Promise<void>,
  keep: (error: unknown) => boolean = () => true,
): Promise<void> {
  // One send at a time: a second would carry the same lines again.
  sending ??= drain(send, keep).finally(() => {
    sending = null;
  });
  return sending;
}

async function drain(send: (entries: AppLogEntry[]) => Promise<void>, keep: (error: unknown) => boolean): Promise<void> {
  while (queue.length > 0) {
    const batch = queue.slice(0, BATCH);
    try {
      await send(batch);
    } catch (error) {
      if (keep(error)) return;
    }
    queue = queue.filter((entry) => !batch.includes(entry));
    save();
  }
}

export function pendingAppLogs(): readonly AppLogEntry[] {
  return queue;
}

/** Told whenever a line is kept — the moment to think about sending. */
export function onAppLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests: a phone that never logged anything. */
export function resetAppLogs(): void {
  queue = [];
  hydrated = false;
  hydrating = null;
  sending = null;
  lastSeen.clear();
  listeners.clear();
}
