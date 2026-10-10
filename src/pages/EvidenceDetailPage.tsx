import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { DEMO_ANSWER } from '../demo/fixtures';
import { getLocalizedDemoAnswer } from '../services';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';
import { SourceCard } from '../components/SourceCard';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { EmptyState } from '../components/EmptyState';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useTranslation();

  const baseResult = id === DEMO_ANSWER.id ? DEMO_ANSWER : null;
  const result = baseResult ? getLocalizedDemoAnswer(baseResult, language) : null;

  if (!result) {
    return (
      <EmptyState
        icon={<Info size={48} />}
        title={t.evidenceNotFoundTitle}
        description={t.evidenceNotFoundDesc}
        action={
          <Link to="/ask" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark cursor-pointer">
            {t.askQuestion}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/ask" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft size={16} aria-hidden="true" />
          {t.backToAsk}
        </Link>
        <LanguageSelector variant="compact" />
      </div>

      {result.isIllustrative && <IllustrativeBanner />}

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t.evidenceDetailsTitle}</h1>
        <p className="text-muted-foreground text-sm">
          {t.yourQuestionLabel}: <span className="text-foreground font-medium">"{result.query}"</span>
        </p>
      </div>

      {/* Overall status with explanation */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="font-heading text-lg font-semibold text-card-foreground mb-3">{t.overallAssessment}</h2>
        <EvidenceStatusBadge status={result.overallStatus} showDescription />
        <p className="text-sm text-card-foreground/90 mt-4 leading-relaxed">{result.summary}</p>
      </div>

      {/* Caveats with High-Contrast Warning styling */}
      {result.caveats.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-950 dark:text-amber-100">
          <h2 className="font-heading text-base font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
            {t.importantCaveats}
          </h2>
          <ul className="space-y-2">
            {result.caveats.map((c, i) => (
              <li key={i} className="text-sm text-amber-900 dark:text-amber-200 flex gap-2">
                <span className="text-amber-700 dark:text-amber-400 font-bold">⚠</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence chunks */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          {t.sourcesHeading} ({result.evidenceChunks.length})
        </h2>
        <div className="space-y-4">
          {result.evidenceChunks.map((chunk) => (
            <SourceCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      </div>

      {/* Evidence status legend */}
      <div className="rounded-2xl bg-muted/60 border border-border p-6">
        <h2 className="font-heading text-base font-semibold text-foreground mb-2">{t.understandingStatuses}</h2>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {t.understandingStatusesDesc}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(EVIDENCE_STATUS_META) as EvidenceStatus[]).map((key) => (
            <div key={key} className="flex items-start gap-2.5 p-2 rounded-xl bg-card border border-border/60">
              <EvidenceStatusBadge status={key} />
              <p className="text-xs text-card-foreground/80 leading-relaxed mt-0.5">
                {key === 'applicable'
                  ? t.statusApplicableDesc
                  : key === 'context_incomplete'
                    ? t.statusContextIncompleteDesc
                    : key === 'conflicting_evidence'
                      ? t.statusConflictingDesc
                      : key === 'freshness_unverified'
                        ? t.statusFreshnessUnverifiedDesc
                        : t.statusInsufficientDesc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t.generatedAtLabel}: {new Date(result.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
