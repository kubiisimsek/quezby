import type { AdminPushCampaign, AdminPushCampaignRequest, AdminPushFilters } from '@quezby/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** How many players and phones the filters pick — asked again whenever they change. */
export function usePushAudience(filters: AdminPushFilters) {
  const api = useApi();
  return useQuery({ queryKey: keys.pushAudience(filters), queryFn: () => api.push.audience(filters), placeholderData: keepPreviousData });
}

export function usePushCampaigns() {
  const api = useApi();
  return useQuery({ queryKey: keys.pushCampaigns(), queryFn: () => api.push.campaigns() });
}

function replace(list: { campaigns: AdminPushCampaign[] } | undefined, campaign: AdminPushCampaign) {
  if (!list) return { campaigns: [campaign] };
  const known = list.campaigns.some((one) => one.id === campaign.id);
  return { campaigns: known ? list.campaigns.map((one) => (one.id === campaign.id ? campaign : one)) : [campaign, ...list.campaigns] };
}

export function usePushActions() {
  const api = useApi();
  const queryClient = useQueryClient();
  const put = useCallback(
    (campaign: AdminPushCampaign) =>
      queryClient.setQueryData(keys.pushCampaigns(), (list: { campaigns: AdminPushCampaign[] } | undefined) => replace(list, campaign)),
    [queryClient],
  );
  const after = ({ campaign }: { campaign: AdminPushCampaign }) => {
    put(campaign);
    void queryClient.invalidateQueries({ queryKey: ['audit'] });
    void queryClient.invalidateQueries({ queryKey: keys.logs() });
  };

  return {
    send: useMutation({ mutationFn: (input: AdminPushCampaignRequest) => api.push.send(input), onSuccess: after }),
    stop: useMutation({ mutationFn: (id: number) => api.push.stop(id), onSuccess: after }),
    put,
  };
}

/**
 * While the page is open, a push still going out goes on: one batch of
 * phones after another, oldest campaign first, until none are left. Cron
 * does the same when the page is closed (`quezby:push:campaigns`).
 */
export function usePushRunner(campaigns: AdminPushCampaign[] | undefined, put: (campaign: AdminPushCampaign) => void, restMs = 1500) {
  const api = useApi();
  const busy = useRef(false);
  const failed = useRef(false);
  const [tick, setTick] = useState(0);
  const next = campaigns?.filter((campaign) => campaign.status === 'sending').at(-1);
  const nextId = next?.id ?? null;
  const done = useRef(0);
  done.current = (next?.sent ?? 0) + (next?.failed ?? 0);

  useEffect(() => {
    if (nextId === null || busy.current || failed.current) return;
    busy.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    api.push
      .step(nextId)
      .then(({ campaign }) => {
        const moved = campaign.status !== 'sending' || campaign.sent + campaign.failed !== done.current;
        busy.current = false;
        put(campaign);
        // Another step is under way elsewhere (cron): look again in a moment.
        timer = setTimeout(() => setTick((count) => count + 1), moved ? 0 : restMs);
      })
      .catch(() => {
        // A step that failed waits for cron or a reload rather than spinning.
        busy.current = false;
        failed.current = true;
      });
    return () => clearTimeout(timer);
  }, [api, nextId, put, tick, restMs]);
}
