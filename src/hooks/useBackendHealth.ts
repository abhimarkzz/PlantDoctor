import { useEffect, useState } from 'react';
import { checkHealth, BackendUnavailableError } from '../api/client';

type BackendStatus = 'checking' | 'connected' | 'unavailable';

export function useBackendHealth(intervalMs = 30_000) {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await checkHealth();
        if (!cancelled) setStatus('connected');
      } catch (err) {
        if (!cancelled) {
          if (err instanceof BackendUnavailableError) {
            setStatus('unavailable');
          } else {
            setStatus('unavailable');
          }
        }
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
