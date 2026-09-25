import type { AdminMe, AdminSession } from '@quezby/types';
import { create } from 'zustand';

/**
 * The panel session: the token, when it stops working, and who it belongs to.
 *
 * It lives in this tab only (`sessionStorage`) unless the admin ticked
 * "Beni hatırla" (`localStorage`). Either way the API ends it after
 * `quezby.admin.token_hours`, and the panel signs out at `expiresAt` on its own.
 */
export type StoredSession = AdminSession & { remember: boolean };

/** Why the last session ended, for the sign-in page to say. */
export type EndReason = 'signed_out' | 'expired';

type SessionState = {
  session: StoredSession | null;
  ended: EndReason | null;
  signIn: (session: AdminSession, remember: boolean) => void;
  /** Swap in a fresher `admin` — a new password clears `mustChangePassword`. */
  update: (admin: AdminMe) => void;
  signOut: (reason?: EndReason) => void;
};

export const SESSION_KEY = 'quezby.admin.session';

function storages(): Storage[] {
  const found: Storage[] = [];
  try {
    found.push(window.localStorage);
  } catch {
    /* blocked storage: this session lives in memory only */
  }
  try {
    found.push(window.sessionStorage);
  } catch {
    /* as above */
  }
  return found;
}

function isSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredSession>;
  return typeof candidate.token === 'string' && typeof candidate.expiresAt === 'string' && typeof candidate.admin === 'object';
}

/** The stored session, if one is there and still good. */
export function readStoredSession(now: Date = new Date()): StoredSession | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(SESSION_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isSession(parsed) && new Date(parsed.expiresAt).getTime() > now.getTime()) return parsed;
    } catch {
      /* unreadable: as good as none */
    }
  }
  return null;
}

function write(session: StoredSession | null): void {
  for (const storage of storages()) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      /* nothing to clear */
    }
  }
  if (!session) return;
  try {
    (session.remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* the session still works for this page */
  }
}

export const useSession = create<SessionState>((set, get) => ({
  session: readStoredSession(),
  ended: null,
  signIn: (session, remember) => {
    const stored = { ...session, remember };
    write(stored);
    set({ session: stored, ended: null });
  },
  update: (admin) => {
    const current = get().session;
    if (!current) return;
    const stored = { ...current, admin };
    write(stored);
    set({ session: stored });
  },
  signOut: (reason = 'signed_out') => {
    if (!get().session) return;
    write(null);
    set({ session: null, ended: reason });
  },
}));

/** The token for the API client — read at call time, never captured. */
export function currentToken(): string | null {
  return useSession.getState().session?.token ?? null;
}
