import * as Dialog from '@radix-ui/react-dialog';
import { Menu as MenuIcon } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { BrandMark } from '@/components/base/brand-mark';
import { Skeleton } from '@/components/base/skeleton';
import { Sidebar } from '@/components/layout/sidebar';
import { ErrorBoundary } from '@/components/patterns/error-boundary';
import { useCounts } from '@/hooks/api/counts';
import { useMe } from '@/hooks/api/me';
import { useSignOut } from '@/hooks/useSignOut';
import { navBadges, navFor } from '@/nav';
import { useSession } from '@/stores/session';

/**
 * The frame every signed-in page sits in: the sidebar on a wide screen, a
 * magenta bar and a drawer on a narrow one, and the page itself — which
 * brings its own header, the brand band.
 */
export function Shell() {
  const location = useLocation();
  const session = useSession((state) => state.session);
  const signOut = useSignOut();
  const [drawer, setDrawer] = useState(false);
  const counts = useCounts();
  useMe();

  // A followed link closes the drawer.
  useEffect(() => setDrawer(false), [location.pathname]);

  if (!session) return null;
  const items = navFor(session.admin.role);
  const badges = navBadges(items, counts.data);
  const sidebar = (showClose: boolean) => (
    <Sidebar
      items={items}
      admin={session.admin}
      badges={badges}
      onSignOut={() => void signOut()}
      onNavigate={showClose ? () => setDrawer(false) : undefined}
      showClose={showClose}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <div className="hidden shrink-0 lg:block">{sidebar(false)}</div>

      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 shadow-overlay outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in lg:hidden"
          >
            <Dialog.Title className="sr-only">Menü</Dialog.Title>
            {sidebar(true)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 bg-brand-from px-4 text-on-brand lg:hidden">
          <button
            type="button"
            aria-label="Menüyü aç"
            onClick={() => setDrawer(true)}
            className="grid size-9 place-items-center rounded-control bg-on-brand/14 transition-[background-color,scale] hover:bg-on-brand/24 active:scale-95"
          >
            <MenuIcon className="size-4.5" />
          </button>
          <BrandMark size="sm" className="shadow-none ring-1 ring-on-brand/30" />
          <span className="truncate text-heading">Quezby Yönetim</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** A page on its way: the band's height in brand, then the canvas with a block. */
function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Sayfa yükleniyor">
      <div className="h-40 bg-brand-band" />
      <div className="relative -mt-7 space-y-6 rounded-t-overlay bg-canvas px-4 pt-6 lg:px-8 lg:pt-8">
        <Skeleton className="h-28 rounded-panel" />
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </div>
  );
}
