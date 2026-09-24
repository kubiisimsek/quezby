import type { AppConfigResponse } from '@quezby/types';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/client';
import { APP_PLATFORM, APP_VERSION } from '@/config/env';

/**
 * Is this build still allowed? Asked on launch and whenever the app comes
 * back to the front. The API decides; a check that fails counts as current —
 * the network must never lock a player out.
 */
export function useAppStatus(): AppConfigResponse | null {
  const [config, setConfig] = useState<AppConfigResponse | null>(null);

  const check = useCallback(async () => {
    try {
      setConfig(await api.app.config(APP_PLATFORM, APP_VERSION));
    } catch {
      setConfig((current) => current);
    }
  }, []);

  useEffect(() => {
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, [check]);

  return config;
}
