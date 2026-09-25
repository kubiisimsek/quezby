import type { AdminRole } from '@quezby/types';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { EmptyState } from '@/components/patterns/empty-state';
import { Page } from '@/components/patterns/page';
import { atLeast } from '@/lib/permissions';
import { useSession } from '@/stores/session';

/**
 * The door to the signed-in panel: no session goes to the sign-in page (and
 * comes back after), and an admin on a temporary password goes to "Hesabım"
 * until they have chosen their own.
 */
export function RequireSession() {
  const session = useSession((state) => state.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (session.admin.mustChangePassword && location.pathname !== '/account') {
    return <Navigate to="/account" replace />;
  }
  return <Outlet />;
}

/** A page for owners only. The menu never links here for anyone else; a typed-in address says why not. */
export function RequireRole({ least, children }: { least: AdminRole; children: ReactNode }) {
  const role = useSession((state) => state.session?.admin.role);
  if (atLeast(role, least)) return <>{children}</>;

  return (
    <Page title="Bu sayfa sana kapalı" description="Bu sayfayı yalnızca Sahip rolündeki yöneticiler açabilir.">
      <div className="rounded-panel bg-raised shadow-card">
        <EmptyState
          icon={<Lock />}
          title="Yetkin yok"
          hint="Buraya erişmen gerekiyorsa panelin sahibinden rolünü değiştirmesini iste."
          action={
            <Button asChild tone="neutral">
              <Link to="/">Genel bakışa dön</Link>
            </Button>
          }
        />
      </div>
    </Page>
  );
}
