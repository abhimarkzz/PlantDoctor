import { WifiOff, ServerOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function ConnectionBanner() {
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendHealth();

  if (isOnline && backendStatus === 'connected') return null;

  return (
    <div role="status" aria-live="polite" className="w-full">
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          <WifiOff size={16} aria-hidden="true" />
          <span>You are offline. Some features may be unavailable.</span>
        </div>
      )}
      {isOnline && backendStatus === 'unavailable' && (
        <div className="flex items-center justify-center gap-2 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800">
          <ServerOff size={16} aria-hidden="true" />
          <span>Backend is not connected. Showing illustrative examples only.</span>
        </div>
      )}
      {isOnline && backendStatus === 'checking' && (
        <div className="flex items-center justify-center gap-2 bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-600">
          <Wifi size={16} aria-hidden="true" className="animate-pulse" />
          <span>Checking backend connection…</span>
        </div>
      )}
    </div>
  );
}
