import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from '@/lib/api';
import { useSession } from '@/stores/session';

/** Ends this session on the API and in the browser, and goes to the sign-in page. */
export function useSignOut(): () => Promise<void> {
  const api = useApi();
  const signOut = useSession((state) => state.signOut);
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Already gone on the API's side: the browser forgets it all the same.
    }
    signOut('signed_out');
    navigate('/login', { replace: true });
  }, [api, signOut, navigate]);
}
