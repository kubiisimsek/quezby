import { describe, expect, it } from 'vitest';

import { currentToken, readStoredSession, SESSION_KEY, useSession } from '@/stores/session';
import { adminMe, adminSession } from '@/test/factories';

describe('the session', () => {
  it('lives in this tab only unless the admin asked to be remembered', () => {
    useSession.getState().signIn(adminSession(), false);

    expect(sessionStorage.getItem(SESSION_KEY)).toContain('test-token');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(currentToken()).toBe('test-token');
  });

  it('stays in the browser when remembered, and in one place only', () => {
    useSession.getState().signIn(adminSession(), false);
    useSession.getState().signIn(adminSession(), true);

    expect(localStorage.getItem(SESSION_KEY)).toContain('test-token');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('forgets a stored session that has run out', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...adminSession({}, '2026-09-25T10:00:00.000Z'), remember: true }));

    expect(readStoredSession(new Date('2026-09-25T09:59:00.000Z'))?.token).toBe('test-token');
    expect(readStoredSession(new Date('2026-09-25T10:00:01.000Z'))).toBeNull();
  });

  it('ignores whatever else is stored under its key', () => {
    localStorage.setItem(SESSION_KEY, '{"token":1}');
    sessionStorage.setItem(SESSION_KEY, 'not json');

    expect(readStoredSession()).toBeNull();
  });

  it('takes a fresher admin without losing the token', () => {
    useSession.getState().signIn(adminSession({ mustChangePassword: true }), false);
    useSession.getState().update(adminMe({ mustChangePassword: false }));

    expect(useSession.getState().session?.admin.mustChangePassword).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}').admin.mustChangePassword).toBe(false);
    expect(currentToken()).toBe('test-token');
  });

  it('signing out clears it everywhere and says why', () => {
    useSession.getState().signIn(adminSession(), true);
    useSession.getState().signOut('expired');

    expect(useSession.getState().session).toBeNull();
    expect(useSession.getState().ended).toBe('expired');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(currentToken()).toBeNull();
  });
});
