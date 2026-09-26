import { ANALYTICS } from '@quezby/config';
import { ApiError } from '@quezby/sdk';

import { sendVisits } from '@/analytics/send';
import { closeVisit, openVisit, ownerOf, type ClosedVisit } from '@/analytics/visit';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

jest.mock('@/api/client', () => ({ api: { analytics: { send: jest.fn() } } }));

const send = (api as unknown as { analytics: { send: jest.Mock } }).analytics.send;

function closed(owner: string | null, id: string): ClosedVisit {
  const visit = closeVisit(openVisit(Date.now() - 60_000, owner, '1.0.0', id.padStart(32, '0')), Date.now());
  if (!visit) throw new Error('a visit of a minute counts');
  return visit;
}

function ready(outbox: ClosedVisit[]) {
  useSession.setState({ token: 'token-a', hydrated: true });
  useSettings.setState({ hydrated: true, analytics: true, consent: 'synced' });
  useVisits.setState({ hydrated: true, outbox });
}

describe('sendVisits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    send.mockResolvedValue({ record: true });
  });

  it('sends this account\'s visits and those from before it signed in, stamped as they leave', async () => {
    const mine = ownerOf('token-a');
    ready([closed(mine, '1'), closed(null, '2')]);

    await sendVisits();

    expect(send).toHaveBeenCalledTimes(1);
    const [batch] = send.mock.calls[0] as [{ sentAt: string; platform: string; visits: Array<{ id: string }> }];
    expect(batch.platform).toBe('ios');
    expect(Math.abs(Date.parse(batch.sentAt) - Date.now())).toBeLessThan(1_000);
    expect(batch.visits.map((visit) => visit.id)).toEqual(['1'.padStart(32, '0'), '2'.padStart(32, '0')]);
    expect(useVisits.getState().outbox).toEqual([]);
  });

  it('never sends another account\'s visits, and lets them go', async () => {
    ready([closed(ownerOf('token-b'), '1'), closed(ownerOf('token-a'), '2')]);

    await sendVisits();

    const [batch] = send.mock.calls[0] as [{ visits: Array<{ id: string }> }];
    expect(batch.visits.map((visit) => visit.id)).toEqual(['2'.padStart(32, '0')]);
    expect(useVisits.getState().outbox).toEqual([]);
  });

  it('sends ten at a time until none is left', async () => {
    ready(Array.from({ length: 13 }, (_, index) => closed(null, String(index + 1))));

    await sendVisits();

    expect(send).toHaveBeenCalledTimes(2);
    expect((send.mock.calls[0] as [{ visits: unknown[] }])[0].visits).toHaveLength(ANALYTICS.visitsPerBatch);
    expect((send.mock.calls[1] as [{ visits: unknown[] }])[0].visits).toHaveLength(3);
  });

  it('stops recording for a day when the API keeps nothing', async () => {
    ready([closed(null, '1'), closed(null, '2')]);
    send.mockResolvedValue({ record: false });

    await sendVisits();

    expect(useVisits.getState().outbox).toEqual([]);
    expect(useVisits.getState().pausedUntil).toBeGreaterThan(Date.now() + ANALYTICS.pauseMs - 5_000);
  });

  it('keeps the visits and waits a minute when the network or the API fails', async () => {
    ready([closed(null, '1')]);
    send.mockRejectedValue(new ApiError(0, 'network', 'offline'));

    await sendVisits();
    expect(useVisits.getState().outbox).toHaveLength(1);
    expect(useVisits.getState().nextTryAt).toBeGreaterThan(Date.now() + ANALYTICS.retryAfterMs - 5_000);

    await sendVisits();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('lets go of visits the API refuses outright', async () => {
    ready([closed(null, '1')]);
    send.mockRejectedValue(new ApiError(422, 'validation_failed', 'no'));

    await sendVisits();

    expect(useVisits.getState().outbox).toEqual([]);
  });

  it('sends nothing before the account has the player\'s yes, or without an account', async () => {
    ready([closed(null, '1')]);
    useSettings.setState({ consent: 'pending' });
    await sendVisits();

    useSettings.setState({ consent: 'synced' });
    useSession.setState({ token: null });
    await sendVisits();

    expect(send).not.toHaveBeenCalled();
    expect(useVisits.getState().outbox).toHaveLength(1);
  });

  it('sends once at a time', async () => {
    ready([closed(null, '1')]);
    let answer: (value: { record: boolean }) => void = () => undefined;
    send.mockImplementation(() => new Promise((resolve) => (answer = resolve)));

    const first = sendVisits();
    const second = sendVisits();
    answer({ record: true });
    await Promise.all([first, second]);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
