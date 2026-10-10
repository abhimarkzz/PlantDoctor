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

  // Pill variant: Big, high-contrast, easy-to-tap buttons for farmers
  return (
    <div
      role="group"
      aria-label={t.chooseLanguage}
      data-testid="language-selector-pills"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
        <Globe size={16} className="text-primary" aria-hidden="true" />
        <span className="hidden sm:inline">{t.selectLanguage}:</span>
      </div>
      {availableLanguages.map((lang) => {
        const isSelected = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={isSelected}
            data-testid={`lang-btn-${lang.code}`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                : 'bg-card border border-border text-foreground hover:bg-muted/80'
            }`}
          >
            <span>{lang.nativeName}</span>
            {lang.code !== 'en' && (
              <span className={`text-[11px] font-normal ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                ({lang.name})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
