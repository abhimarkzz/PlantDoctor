import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageCircleQuestion, BookOpen, Info, Leaf, Download, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { InstallModal } from './InstallModal';
import { LanguageSelector } from './LanguageSelector';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

import { useTranslation } from '../i18n/LanguageContext';

export function NavBar() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const navItems = [
    { to: '/', label: t.navHome, icon: Home },
    { to: '/ask', label: t.navAsk, icon: MessageCircleQuestion },
    { to: '/library', label: t.navLibrary, icon: BookOpen },
    { to: '/about', label: t.navAbout, icon: Info },
  ];

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card min-h-screen"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Leaf size={28} className="text-primary" aria-hidden="true" />
            <span className="font-heading text-xl font-bold text-foreground">Plant Doctor</span>
          </div>
        </div>

        {/* Live status badge */}
        <div className="px-6 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2 text-xs" data-testid="nav-online-status">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-green-600 animate-pulse' : 'bg-amber-600'
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {isOnline ? t.networkOnline : t.offlineMode}
            </span>
            <span className="text-muted-foreground ml-auto text-[11px]">
              {isOnline ? t.ready : t.cachedShell}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Language Selector */}
        <div className="px-4 py-3 border-t border-border">
          <LanguageSelector variant="dropdown" className="w-full justify-between" />
        </div>

        {/* Install PWA action */}
        <div className="px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            aria-label={t.installAppPwa}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={15} aria-hidden="true" />
            <span>{t.installAppPwa}</span>
          </button>
        </div>

        <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
          v0.2.0 — Multimodal & Multilingual
        </div>
      </nav>

      {/* Mobile top status bar when offline */}
      {!isOnline && (
        <div
          data-testid="mobile-offline-indicator"
          className="md:hidden sticky top-0 left-0 right-0 z-40 bg-amber-600 text-white text-[11px] font-medium py-1.5 px-3 text-center flex items-center justify-center gap-1.5 shadow-xs"
        >
          <WifiOff size={12} aria-hidden="true" />
          <span>{t.offlineMode} — {t.cachedShell}</span>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-medium transition-colors duration-150 cursor-pointer min-w-[64px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          aria-label={t.installApp}
          className="flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer min-w-[64px]"
        >
          <Download size={22} aria-hidden="true" />
          {t.installApp}
        </button>
      </nav>

      {/* Install Guide Modal */}
      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setDeferredPrompt(null)}
      />
    </>
  );
}

