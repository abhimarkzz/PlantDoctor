import { useState, useEffect } from 'react';
import { X, Smartphone, Apple, Download, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onInstallSuccess?: () => void;
}

export function InstallModal({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}: InstallModalProps) {
  const [platform, setPlatform] = useState<'android' | 'ios'>(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    }
    return 'android';
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleNativeInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        onInstallSuccess?.();
        onClose();
      }
    } catch {
      // User dismissed or browser error
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-xl text-card-foreground space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="install-modal-title" className="font-heading text-lg font-bold text-foreground">
                Install Plant Doctor
              </h2>
              <p className="text-xs text-muted-foreground">Add to your device for offline shell access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close installation guide"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick install button if browser supports beforeinstallprompt */}
        {deferredPrompt && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              One-click install available
            </p>
            <button
              type="button"
              onClick={handleNativeInstall}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors cursor-pointer shadow-xs"
            >
              <Download size={16} aria-hidden="true" />
              Install Plant Doctor Now
            </button>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="flex rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs md:text-sm font-medium transition-colors cursor-pointer ${
              platform === 'android'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone size={16} aria-hidden="true" />
            Android / Chrome
          </button>
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs md:text-sm font-medium transition-colors cursor-pointer ${
              platform === 'ios'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Apple size={16} aria-hidden="true" />
            iPhone / Safari
          </button>
        </div>

        {/* Instructions content */}
        <div className="space-y-4 text-sm text-foreground/90">
          {platform === 'android' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                Installing on Android (Chrome / Edge / Firefox)
              </h3>
              <ol className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</span>
                  <span>Open <strong>Plant Doctor</strong> in <strong>Google Chrome</strong> or modern Android browser.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</span>
                  <span>Tap the <strong>three dots</strong> menu (⋮) in the top-right corner of Chrome.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</span>
                  <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">4</span>
                  <span>Tap <strong>Install</strong> to confirm. The Plant Doctor icon will appear on your home screen and launcher.</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                Installing on iPhone / iPad (Safari)
              </h3>
              <ol className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</span>
                  <span>Open <strong>Plant Doctor</strong> in <strong>Apple Safari</strong> (iOS requires Safari for home screen installation).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</span>
                  <span>Tap the <strong>Share</strong> button (the square with an upward arrow <ArrowUpRight size={14} className="inline -mt-0.5" />) in the bottom toolbar.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</span>
                  <span>Scroll down the share sheet and tap <strong>"Add to Home Screen"</strong> (➕).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">4</span>
                  <span>Tap <strong>Add</strong> in the top-right corner. Plant Doctor will appear as a full standalone app on your home screen.</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Benefits notice */}
        <div className="rounded-xl border border-border bg-muted/60 p-3.5 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-primary shrink-0" aria-hidden="true" />
            What offline installation provides
          </p>
          <p className="leading-relaxed">
            Installing provides standalone window mode and caches the full application shell so you can open the app and review cached materials without connectivity.
          </p>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
