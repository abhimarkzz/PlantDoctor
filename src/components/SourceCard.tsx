import { ExternalLink, Building2, Calendar, ShieldCheck, FileText, Info } from 'lucide-react';
import type { EvidenceChunk } from '../models/types';
import { EvidenceStatusBadge } from './EvidenceStatusBadge';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  chunk: EvidenceChunk;
}

export function SourceCard({ chunk }: Props) {
  const { t } = useTranslation();
  const { source } = chunk;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md space-y-4">
      {/* Top Header with Source Title and Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
              <FileText size={12} aria-hidden="true" />
              <span>{t.originalSourceExcerpt}</span>
            </span>
            {chunk.pageOrSection && (
              <span className="text-xs text-muted-foreground">📄 {chunk.pageOrSection}</span>
            )}
          </div>
          <h3 className="font-heading text-base font-semibold text-card-foreground leading-snug break-words">
            {source.title}
          </h3>
        </div>
        <EvidenceStatusBadge status={chunk.status} />
      </div>

      {/* Verbatim Research Excerpt with Scientific Provenance Marker */}
      <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
        <p className="text-sm text-card-foreground/90 leading-relaxed font-sans border-l-3 border-primary/50 pl-3 italic break-words">
          "{chunk.text}"
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
          <Info size={12} className="text-primary shrink-0" aria-hidden="true" />
          <span>{t.originalSourceNote}</span>
        </p>
      </div>

      {/* Provenance Metadata Tags */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
        {source.identifier && (
          <span className="font-mono rounded bg-muted px-2 py-0.5 break-all font-medium text-foreground">
            {source.identifier}
          </span>
        )}
        {source.authors && source.authors.length > 0 && (
          <span>
            <strong className="text-foreground">{t.sourceAuthors}:</strong> {source.authors.join(', ')}
          </span>
        )}
        {source.institution && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} aria-hidden="true" className="text-primary" />
            <span>{source.institution}</span>
          </span>
        )}
        {source.publishedDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={13} aria-hidden="true" />
            <span>{source.publishedDate}</span>
          </span>
        )}
        {source.lastVerified ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck size={13} aria-hidden="true" />
            <span>{t.sourceVerified} {new Date(source.lastVerified).toLocaleDateString()}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
            <ShieldCheck size={13} aria-hidden="true" />
            <span>{t.sourceNotVerified}</span>
          </span>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline ml-auto font-medium cursor-pointer"
          >
            <ExternalLink size={13} aria-hidden="true" />
            <span>{t.sourceViewLink}</span>
          </a>
        )}
      </div>

      {/* Relevance Meter */}
      {chunk.relevanceScore !== null && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.sourceRelevance}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(chunk.relevanceScore * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t.sourceRelevance}>
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${chunk.relevanceScore * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{Math.round(chunk.relevanceScore * 100)}%</span>
          </div>
        </div>
      )}
    </article>
  );
}
