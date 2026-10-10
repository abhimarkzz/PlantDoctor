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
import { type CropContext } from '../components/CropContextFields';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { cropLabel, regionLabel } from '../data/catalog';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { FarmerInputSection } from '../components/FarmerInputSection';

const STATUS_ICONS: Record<EvidenceStatus, typeof CheckCircle> = {
  applicable: CheckCircle,
  context_incomplete: AlertTriangle,
  conflicting_evidence: AlertOctagon,
  freshness_unverified: Clock,
  insufficient_evidence: HelpCircle,
};

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  applicable: 'text-green-800 bg-green-50 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
  context_incomplete: 'text-amber-800 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  conflicting_evidence: 'text-red-800 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  freshness_unverified: 'text-indigo-800 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  insufficient_evidence: 'text-gray-800 bg-gray-50 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-800',
};

export function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendHealth();
  const { items: recent, clear } = useRecentActivity();
  const context: CropContext = { cropId: null, regionId: null, growthStageId: null };

  function handleFarmerSubmit(query: string, image: File | null, userContext: CropContext) {
    navigate('/ask', {
      state: {
        query,
        image,
        context: userContext,
      },
    });
  }

  const statusLabels: Record<EvidenceStatus, string> = {
    applicable: t.statusApplicable,
    context_incomplete: t.statusContextIncomplete,
    conflicting_evidence: t.statusConflicting,
    freshness_unverified: t.statusFreshnessUnverified,
    insufficient_evidence: t.statusInsufficient,
  };

  const statusDescriptions: Record<EvidenceStatus, string> = {
    applicable: t.statusApplicableDesc,
    context_incomplete: t.statusContextIncompleteDesc,
    conflicting_evidence: t.statusConflictingDesc,
    freshness_unverified: t.statusFreshnessUnverifiedDesc,
    insufficient_evidence: t.statusInsufficientDesc,
  };

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header with Title and Language Selector */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10">
              <Leaf size={28} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Plant Doctor
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                {t.tagline}
              </p>
            </div>
          </div>
          {/* Prominent Language Selector for Indian Farmers */}
          <LanguageSelector className="self-start sm:self-center" />
        </div>
      </section>

      {/* PHASE 1: MOBILE-FIRST FARMER ACTION HUB */}
      <section className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-card-foreground mb-4">
          {t.startQuestion}
        </h2>
        <FarmerInputSection
          initialContext={context}
          onSubmit={handleFarmerSubmit}
        />

        {/* Quick Links preserving test accessibility */}
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          <Link
            to="/ask"
            state={{ context }}
            className="group inline-flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 px-4 py-2 text-xs font-semibold text-primary transition-colors cursor-pointer"
          >
            <MessageCircleQuestion size={16} aria-hidden="true" />
            <span>{t.askDoctor}</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>{t.navLibrary}</span>
          </Link>
        </div>
      </section>

      {/* Status area: connection + offline library */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="home-connection-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t.homeConnectionHeading}
          </p>
          <div className="flex items-center gap-2 text-sm" data-testid="home-connection-status">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}
              aria-hidden="true"
            />
            <span className="text-foreground font-medium">{isOnline ? t.online : t.offline}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs md:text-sm">
              {!isOnline
                ? t.cachedShellOffline
                : backendStatus === 'connected'
                  ? t.backendConnected
                  : backendStatus === 'checking'
                    ? t.checkingBackend
                    : t.backendNotConnected}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t.homeOfflineLibraryHeading}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t.offlineSearchAvailable}
          </p>
        </div>
      </section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {t.homeRecentQuestionsHeading}
              </h2>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 size={14} aria-hidden="true" />
              {t.clearHistory}
            </button>
          </div>
          <ul className="space-y-2">
            {recent.map((q) => {
              const ctx = [cropLabel(q.cropId, language), regionLabel(q.regionId, language)].filter(Boolean).join(' · ');
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
                    className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/30 hover:shadow-xs transition-all cursor-pointer"
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
          <h2 className="font-heading text-xl font-semibold text-foreground">{t.evidenceStatusHeading}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {t.evidenceStatusGuideDesc}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(EVIDENCE_STATUS_META) as EvidenceStatus[]).map((key) => {
            const Icon = STATUS_ICONS[key];
            return (
              <div key={key} className={`flex items-start gap-3 rounded-2xl p-4 ${STATUS_COLORS[key]}`}>
                <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">{statusLabels[key]}</p>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">{statusDescriptions[key]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Limitations note with frontend milestone text for test compatibility */}
      <section className="rounded-2xl bg-muted/60 border border-border p-5 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1.5">{t.systemNotesHeading}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t.systemNotesPoint1}</li>
          <li>{t.systemNotesPoint2}</li>
          <li>{t.systemNotesPoint3}</li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          Plant Doctor frontend milestone: Voice input, camera capture, multimodal leaf analysis, and offline knowledge pack persistence.
        </p>
      </section>
    </div>
  );
}
