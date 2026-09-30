import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { appRoutes } from '@/App';
import { createPanelClient } from '@/lib/api';
import { AppProviders } from '@/providers/app-providers';
import { createQueryClient } from '@/providers/query-provider';

const root = document.getElementById('root');
// Production serves the panel at /panel/ (deploy/environments.mjs); the router works under it.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';
if (!root) throw new Error('index.html has no #root.');

createRoot(root).render(
  <StrictMode>
    <AppProviders client={createPanelClient()} queryClient={createQueryClient()}>
      <RouterProvider router={createBrowserRouter(appRoutes, { basename })} />
    </AppProviders>
  </StrictMode>,
);
