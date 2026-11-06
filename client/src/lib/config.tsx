'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getPublicConfig, DEFAULT_APP_NAME } from './auth';

interface ConfigContextType {
  appName: string;
  setAppName: (name: string) => void;
  refreshConfig: () => Promise<void>;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
  appName: DEFAULT_APP_NAME,
  setAppName: () => {},
  refreshConfig: async () => {},
  loading: false,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await getPublicConfig();
      if (cfg?.app_name) {
        setAppName(cfg.app_name);
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    if (typeof document !== 'undefined' && appName) {
      document.title = appName;
    }
  }, [appName]);

  return (
    <ConfigContext.Provider value={{ appName, setAppName, refreshConfig, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(ConfigContext);
}
