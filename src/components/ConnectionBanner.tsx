import { WifiOff, ServerOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function ConnectionBanner() {
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendHealth();

  if (isOnline && backendStatus === 'connected') return null;

  return (
    <div role="status" aria-live="polite" className="w-full" data-testid="connection-banner">
      {!isOnline && (
        <div
          data-testid="offline-banner"
          className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800"
        >
          <WifiOff size={16} aria-hidden="true" />
          <span>You are offline. Application shell is cached, but live question answering and library sync require an internet connection.</span>
        </div>
      )}
      {isOnline && backendStatus === 'unavailable' && (
        <div
          data-testid="backend-unavailable-banner"
          className="flex items-center justify-center gap-2 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800"
        >
          <ServerOff size={16} aria-hidden="true" />
          <span>Backend is not connected. Showing illustrative examples only.</span>
        </div>
      )}
      {isOnline && backendStatus === 'checking' && (
        <div
          data-testid="backend-checking-banner"
          className="flex items-center justify-center gap-2 bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-600"
        >
          <Wifi size={16} aria-hidden="true" className="animate-pulse" />
          <span>Checking backend connection…</span>
        </div>
      )}
    </div>
  );
}
