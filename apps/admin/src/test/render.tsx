import type { AdminSession } from '@quezby/types';
import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';

import { appRoutes } from '@/App';
import { AppProviders } from '@/providers/app-providers';
import { useSession } from '@/stores/session';
import { adminSession } from '@/test/factories';
import { asClient, fakeApi, type FakeApi } from '@/test/fake-api';

function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
}

/**
 * The whole panel at `path`, on a fake API, signed in as `session` (an owner
 * unless the test says otherwise; `null` for signed out). The shell's own
 * reads — who am I, what waits — answer quietly unless stubbed.
 */
export function renderApp({
  path = '/',
  api = fakeApi(),
  session = adminSession(),
}: {
  path?: string;
  api?: FakeApi;
  session?: AdminSession | null;
} = {}) {
  useSession.setState({ session: session ? { ...session, remember: false } : null, ended: null });
  if (session) {
    api.me.get.mockResolvedValue({ admin: session.admin });
    api.overview.counts.mockResolvedValue({ review: 0 });
  }
  const queryClient = testQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const view = render(
    <AppProviders client={asClient(api)} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, api, router, queryClient, user: userEvent.setup() };
}

/** One component with everything a page gives it, at `path`. */
export function renderWithProviders(ui: ReactNode, { api = fakeApi(), path = '/' }: { api?: FakeApi; path?: string } = {}) {
  const queryClient = testQueryClient();
  const view = render(
    <AppProviders client={asClient(api)} queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { ...view, api, queryClient, user: userEvent.setup() };
}
