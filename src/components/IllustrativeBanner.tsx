import { FlaskConical } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export function IllustrativeBanner() {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 p-4 text-sm text-amber-950 dark:text-amber-100"
    >
      <FlaskConical size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
      <div>
        <p className="font-semibold text-amber-950 dark:text-amber-100">{t.illustrativeExampleTitle}</p>
        <p className="mt-1 leading-relaxed text-amber-900/90 dark:text-amber-200">
          {t.illustrativeExampleDesc}
        </p>
      </div>
    </div>
  );
}
