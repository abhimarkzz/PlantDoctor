import { FlaskConical } from 'lucide-react';

export function IllustrativeBanner() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <FlaskConical size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Illustrative example — not real guidance</p>
        <p className="mt-1 leading-relaxed">
          This response uses placeholder data to demonstrate how evidence-grounded results
          will appear once the backend is connected. Do not act on this information.
        </p>
      </div>
    </div>
  );
}
