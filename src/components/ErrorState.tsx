import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: Props) {
  const { t } = useTranslation();
  const displayTitle = title ?? t.errorGeneric;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <AlertCircle size={48} className="text-destructive mb-4" aria-hidden="true" />
      <h2 className="font-heading text-xl font-semibold text-foreground mb-2">{displayTitle}</h2>
      <p className="text-muted-foreground text-sm max-w-md leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-dark cursor-pointer"
        >
          <RefreshCw size={16} aria-hidden="true" />
          {t.tryAgain}
        </button>
      )}
    </div>
  );
}
