import { Link } from 'react-router-dom';
import {
  MessageCircleQuestion,
  BookOpen,
  Shield,
  Leaf,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';

const STATUS_ICONS: Record<EvidenceStatus, typeof CheckCircle> = {
  applicable: CheckCircle,
  context_incomplete: AlertTriangle,
  conflicting_evidence: AlertOctagon,
  freshness_unverified: Clock,
  insufficient_evidence: HelpCircle,
};

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  applicable: 'text-green-700 bg-green-50',
  context_incomplete: 'text-amber-700 bg-amber-50',
  conflicting_evidence: 'text-red-700 bg-red-50',
  freshness_unverified: 'text-indigo-700 bg-indigo-50',
  insufficient_evidence: 'text-gray-600 bg-gray-50',
};

export function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-8 md:py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
          <Leaf size={40} className="text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
          Plant Doctor
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
          Evidence-grounded agricultural guidance with traceable sources and honest uncertainty.
        </p>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/ask"
          className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer"
        >
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
            <MessageCircleQuestion size={24} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-semibold text-card-foreground mb-1">Ask Plant Doctor</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe a plant health issue and receive evidence-grounded guidance.
            </p>
          </div>
          <ArrowRight size={20} className="text-muted-foreground mt-1 group-hover:text-primary transition-colors" aria-hidden="true" />
        </Link>

        <Link
          to="/library"
          className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer"
        >
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 text-secondary">
            <BookOpen size={24} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-semibold text-card-foreground mb-1">Offline Library</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browse knowledge packs for offline agricultural reference.
            </p>
          </div>
          <ArrowRight size={20} className="text-muted-foreground mt-1 group-hover:text-primary transition-colors" aria-hidden="true" />
        </Link>
      </section>

      {/* Evidence Status Gate info */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold text-foreground">Evidence Status Gate</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Every piece of guidance shows an evidence status so you know how much to rely on it.
          These describe <strong>intended system behavior</strong> — they are not yet implemented
          or scientifically validated until the backend is connected and tested.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(EVIDENCE_STATUS_META) as [EvidenceStatus, typeof EVIDENCE_STATUS_META[EvidenceStatus]][]).map(
            ([key, meta]) => {
              const Icon = STATUS_ICONS[key];
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-xl p-4 ${STATUS_COLORS[key]}`}
                >
                  <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs mt-1 opacity-80 leading-relaxed">{meta.description}</p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-2">Current limitations</p>
        <ul className="list-disc list-inside space-y-1">
          <li>This is the frontend milestone — no backend, database, or model is connected.</li>
          <li>All example data is clearly labelled as illustrative and should not be acted upon.</li>
          <li>Image upload does not perform diagnosis; no inference model is running.</li>
          <li>Offline knowledge packs are not yet downloadable or searchable.</li>
        </ul>
      </section>
    </div>
  );
}
