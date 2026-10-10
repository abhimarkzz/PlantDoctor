import { WifiOff, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface OfflineServiceScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
  hint?: string;
  className?: string;
}

export function OfflineServiceScreen({
  title,
  message,
  onRetry,
  secondaryAction,
  hint,
  className = '',
}: OfflineServiceScreenProps) {
  const { t } = useTranslation();

  const displayTitle = title ?? t.offlineScreenTitle;
  const displayMessage = message ?? t.offlineScreenMessage;
  const displayHint = hint ?? t.offlineScopeHint;

  return (
    <div
      role="region"
      aria-label={t.offlineNotificationAria}
      className={`rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 p-6 md:p-8 text-center space-y-5 ${className}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 shadow-xs">
        <WifiOff size={28} aria-hidden="true" />
      </div>

      <div className="max-w-lg mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-200/90 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 mb-1">
          <ShieldAlert size={13} aria-hidden="true" />
          <span>{t.offlineShellDisconnected}</span>
        </div>
        <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground tracking-tight">
          {displayTitle}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {displayMessage}
        </p>
      </div>

      <div className="rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-white/90 dark:bg-card/90 p-4 max-w-lg mx-auto text-left text-xs md:text-sm text-foreground/90 space-y-2">
        <p className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-800 dark:text-amber-400 shrink-0" aria-hidden="true" />
          {t.offlineScopeBoundary}
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {displayHint}
        </p>
        <p className="text-muted-foreground/90 text-[11px] leading-relaxed pt-1 border-t border-amber-200 dark:border-amber-900/40">
          {t.offlineIndexDbNotice}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-dark cursor-pointer shadow-xs"
          >
            <RefreshCw size={16} aria-hidden="true" />
            {t.checkConnectionRetry}
          </button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}
