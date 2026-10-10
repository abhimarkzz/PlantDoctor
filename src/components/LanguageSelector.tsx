import { useTranslation } from '../i18n/LanguageContext';
import type { SupportedLanguage } from '../i18n/types';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'pill' | 'dropdown' | 'compact';
}

export function LanguageSelector({ className = '', variant = 'pill' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, t } = useTranslation();

  if (variant === 'dropdown' || variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <Globe size={variant === 'compact' ? 16 : 18} className="text-primary shrink-0" aria-hidden="true" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          aria-label={t.selectLanguage}
          data-testid="language-selector-select"
          className={`rounded-xl border border-border bg-card font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs ${
            variant === 'compact' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
          }`}
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Pill variant: Big, high-contrast, easy-to-tap tactile segmented buttons for farmers
  return (
    <div
      role="group"
      aria-label={t.chooseLanguage}
      data-testid="language-selector-pills"
      className={`w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
        <Globe size={15} className="text-primary shrink-0" aria-hidden="true" />
        <span>{t.selectLanguage}:</span>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-stretch gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/80 shadow-xs">
        {availableLanguages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              aria-pressed={isSelected}
              aria-label={`${lang.nativeName} (${lang.name})`}
              data-testid={`lang-btn-${lang.code}`}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center text-center whitespace-nowrap ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-xs ring-2 ring-primary/30 font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
              }`}
            >
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
