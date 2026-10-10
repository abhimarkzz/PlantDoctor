import { useEffect, useState } from 'react';
import { checkHealth, DeviceOfflineError } from '../api/client';
import { useOnlineStatus } from './useOnlineStatus';

export type BackendStatus = 'checking' | 'connected' | 'unavailable';

export function useBackendHealth(intervalMs = 30_000): BackendStatus {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<BackendStatus>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'unavailable';
    }
    return 'checking';
  });

  useEffect(() => {
    if (!isOnline) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;

    async function check() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      try {
        await checkHealth();
        if (!cancelled) setStatus('connected');
      } catch (err) {
        if (!cancelled) {
          if (err instanceof DeviceOfflineError) {
            setStatus('unavailable');
          } else {
            setStatus('unavailable');
          }
        }
      }
    }

    setStatus('checking');
    void check();
    const id = setInterval(() => {
      void check();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOnline, intervalMs]);

  return status;
}
