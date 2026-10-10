import { useId } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface Option {
  id: string;
  label: string;
}

interface Props {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required = false,
  optional = false,
  hint,
}: Props) {
  const id = useId();
  const { t } = useTranslation();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
        {optional && <span className="text-muted-foreground font-normal ml-1.5">{t.optionalBadge}</span>}
      </label>
      <select
        id={id}
        value={value ?? ''}
        required={required}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
