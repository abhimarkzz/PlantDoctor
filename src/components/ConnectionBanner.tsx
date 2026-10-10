import { WifiOff, ServerOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useTranslation } from '../i18n/LanguageContext';

export function ConnectionBanner() {
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendHealth();
  const { t } = useTranslation();

  if (isOnline && backendStatus === 'connected') return null;

  return (
    <div role="status" aria-live="polite" className="w-full" data-testid="connection-banner">
      {!isOnline && (
        <div
          data-testid="offline-banner"
          className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          <WifiOff size={16} aria-hidden="true" />
          <span>{t.offlineNotice}</span>
        </div>
      )}
      {isOnline && backendStatus === 'unavailable' && (
        <div
          data-testid="backend-unavailable-banner"
          className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 px-4 py-2 text-sm text-blue-900 dark:text-blue-200"
        >
          <ServerOff size={16} aria-hidden="true" />
          <span>{t.backendUnavailableBanner}</span>
        </div>
      )}
      {isOnline && backendStatus === 'checking' && (
        <div
          data-testid="backend-checking-banner"
          className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <Wifi size={16} aria-hidden="true" className="animate-pulse" />
          <span>{t.checkingBackend}</span>
        </div>
      )}
    </div>
  );
}
