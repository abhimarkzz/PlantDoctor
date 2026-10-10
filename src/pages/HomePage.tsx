import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  History,
  Trash2,
} from 'lucide-react';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';
import { CropContextFields, type CropContext } from '../components/CropContextFields';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { cropLabel, regionLabel } from '../data/catalog';

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
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendHealth();
  const { items: recent, clear } = useRecentActivity();
  const [context, setContext] = useState<CropContext>({ cropId: null, regionId: null, growthStageId: null });

  return (
    <div className="space-y-10">
      {/* Compact header — keeps the task reachable without a giant hero */}
      <section className="flex items-center gap-4">
        <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <Leaf size={28} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Plant Doctor
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Ask an agricultural question and get evidence-backed guidance with traceable sources and honest uncertainty.
          </p>
        </div>
      </section>

      {/* Primary task: pick context, go ask */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-card-foreground mb-4">
          Start a question
        </h2>
        <CropContextFields value={context} onChange={setContext} />
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/ask"
            state={{ context }}
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-dark cursor-pointer"
          >
            <MessageCircleQuestion size={18} aria-hidden="true" />
            Ask Plant Doctor
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <BookOpen size={18} aria-hidden="true" />
            Offline Library
          </Link>
        </div>
      </section>

      {/* Status area: connection + offline library */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4" data-testid="home-connection-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Connection</p>
          <div className="flex items-center gap-2 text-sm" data-testid="home-connection-status">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}
              aria-hidden="true"
            />
            <span className="text-foreground font-medium">{isOnline ? 'Online' : 'Offline'}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {!isOnline
                ? 'App shell cached (offline mode)'
                : backendStatus === 'connected'
                  ? 'Backend connected'
                  : backendStatus === 'checking'
                    ? 'Checking backend…'
                    : 'Backend not connected'}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Offline library</p>
          <p className="text-sm text-muted-foreground">
            No knowledge packs installed. Offline packs are not yet available.
          </p>
        </div>
      </section>

      {/* Recent activity — only when real local state exists */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Recent questions</h2>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear
            </button>
          </div>
          <ul className="space-y-2">
            {recent.map((q) => {
              const ctx = [cropLabel(q.cropId), regionLabel(q.regionId)].filter(Boolean).join(' · ');
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/ask', {
                        state: {
                          query: q.query,
                          context: { cropId: q.cropId, regionId: q.regionId, growthStageId: null },
                        },
                      })
                    }
                    className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <p className="text-sm text-card-foreground line-clamp-1">{q.query}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ctx && <span>{ctx} · </span>}
                      {new Date(q.submittedAt).toLocaleString()}
                      {q.illustrative && <span className="text-amber-600"> · illustrative</span>}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Evidence-backed guidance explanation */}
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
                <div key={key} className={`flex items-start gap-3 rounded-xl p-4 ${STATUS_COLORS[key]}`}>
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
