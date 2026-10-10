import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { LanguageSelector } from '../components/LanguageSelector';
import { Leaf } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../i18n/LanguageContext';

export function Layout() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen">
      <NavBar />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top app bar with branding, status, and compact language selector */}
        <header
          data-testid="mobile-top-bar"
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-card/95 backdrop-blur-sm border-b border-border shadow-xs"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
              <Leaf size={16} aria-hidden="true" />
            </div>
            <span className="font-heading text-base font-bold text-foreground">Plant Doctor</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-600' : 'bg-amber-600'}`}
              title={isOnline ? t.networkOnline : t.offlineMode}
              aria-label={isOnline ? t.networkOnline : t.offlineMode}
            />
          </div>
          <LanguageSelector variant="compact" />
        </header>

        <ConnectionBanner />
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 max-w-4xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
