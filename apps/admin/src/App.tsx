import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RequireRole, RequireSession } from '@/components/layout/gate';
import { Shell } from '@/components/layout/shell';
import { LoginPage } from '@/pages/LoginPage';

/**
 * The signed-in pages load when first opened, so the sign-in page and the
 * shell come down alone; `Shell` shows a skeleton meanwhile.
 */
const AccountPage = lazy(() => import('@/pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const AdminsPage = lazy(() => import('@/pages/AdminsPage').then((module) => ({ default: module.AdminsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const AuditPage = lazy(() => import('@/pages/AuditPage').then((module) => ({ default: module.AuditPage })));
const BoardsPage = lazy(() => import('@/pages/BoardsPage').then((module) => ({ default: module.BoardsPage })));
const ContentPage = lazy(() => import('@/pages/ContentPage').then((module) => ({ default: module.ContentPage })));
const DailyPage = lazy(() => import('@/pages/DailyPage').then((module) => ({ default: module.DailyPage })));
const LeagueGroupPage = lazy(() => import('@/pages/LeagueGroupPage').then((module) => ({ default: module.LeagueGroupPage })));
const LeaguesPage = lazy(() => import('@/pages/LeaguesPage').then((module) => ({ default: module.LeaguesPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const PlayerPage = lazy(() => import('@/pages/PlayerPage').then((module) => ({ default: module.PlayerPage })));
const PlayersPage = lazy(() => import('@/pages/PlayersPage').then((module) => ({ default: module.PlayersPage })));
const RunPage = lazy(() => import('@/pages/RunPage').then((module) => ({ default: module.RunPage })));
const RunsPage = lazy(() => import('@/pages/RunsPage').then((module) => ({ default: module.RunsPage })));
const SuspectsPage = lazy(() => import('@/pages/SuspectsPage').then((module) => ({ default: module.SuspectsPage })));
const SystemPage = lazy(() => import('@/pages/SystemPage').then((module) => ({ default: module.SystemPage })));

/**
 * Every page of the panel. `main.tsx` serves them from a browser router; the
 * tests from a memory router, the same table.
 */
export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        element: <Shell />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/players', element: <PlayersPage /> },
          { path: '/players/:playerId', element: <PlayerPage /> },
          { path: '/suspects', element: <SuspectsPage /> },
          { path: '/runs', element: <RunsPage /> },
          { path: '/runs/:runId', element: <RunPage /> },
          { path: '/boards', element: <BoardsPage /> },
          { path: '/daily', element: <DailyPage /> },
          { path: '/leagues', element: <LeaguesPage /> },
          { path: '/leagues/:groupId', element: <LeagueGroupPage /> },
          { path: '/content', element: <ContentPage /> },
          { path: '/audit', element: <AuditPage /> },
          {
            path: '/admins',
            element: (
              <RequireRole least="owner">
                <AdminsPage />
              </RequireRole>
            ),
          },
          {
            path: '/system',
            element: (
              <RequireRole least="owner">
                <SystemPage />
              </RequireRole>
            ),
          },
          { path: '/account', element: <AccountPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
