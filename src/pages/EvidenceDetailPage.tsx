import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { DEMO_ANSWER } from '../demo/fixtures';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';
import { SourceCard } from '../components/SourceCard';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { EmptyState } from '../components/EmptyState';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';

export function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();

  // In the frontend-only milestone, only the demo answer is available
  const result = id === DEMO_ANSWER.id ? DEMO_ANSWER : null;

  if (!result) {
    return (
      <EmptyState
        icon={<Info size={48} />}
        title="Evidence not found"
        description="This evidence result does not exist or the backend is not connected."
        action={
          <Link to="/ask" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark cursor-pointer">
            Ask a question
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/ask" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Ask
      </Link>

      {result.isIllustrative && <IllustrativeBanner />}

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Evidence Details</h1>
        <p className="text-muted-foreground text-sm">
          Question: <span className="text-foreground font-medium">"{result.query}"</span>
        </p>
      </div>

      {/* Overall status with explanation */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-card-foreground mb-3">Overall Assessment</h2>
        <EvidenceStatusBadge status={result.overallStatus} showDescription />
        <p className="text-sm text-card-foreground/90 mt-4 leading-relaxed">{result.summary}</p>
      </div>

      {/* Caveats */}
      {result.caveats.length > 0 && (
        <div className="rounded-2xl bg-warning-bg border border-amber-200 p-5">
          <h2 className="font-heading text-base font-semibold text-foreground mb-3">Important caveats</h2>
          <ul className="space-y-2">
            {result.caveats.map((c, i) => (
              <li key={i} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-amber-600 font-bold">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence chunks */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Sources ({result.evidenceChunks.length})
        </h2>
        <div className="space-y-4">
          {result.evidenceChunks.map((chunk) => (
            <SourceCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      </div>

      {/* Evidence status legend */}
      <div className="rounded-2xl bg-muted p-6">
        <h2 className="font-heading text-base font-semibold text-foreground mb-3">Understanding evidence statuses</h2>
        <p className="text-xs text-muted-foreground mb-4">
          These labels describe <em>intended system behavior</em>. They are not yet implemented or validated.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.entries(EVIDENCE_STATUS_META) as [EvidenceStatus, typeof EVIDENCE_STATUS_META[EvidenceStatus]][]).map(([key, meta]) => (
            <div key={key} className="flex items-start gap-2">
              <EvidenceStatusBadge status={key} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{meta.description}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Generated at: {new Date(result.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
