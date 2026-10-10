import { ExternalLink, Building2, Calendar, ShieldCheck } from 'lucide-react';
import type { EvidenceChunk } from '../models/types';
import { EvidenceStatusBadge } from './EvidenceStatusBadge';

interface Props {
  chunk: EvidenceChunk;
}

export function SourceCard({ chunk }: Props) {
  const { source } = chunk;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <h3 className="font-heading text-base font-semibold text-card-foreground leading-snug flex-1 min-w-0">
          {source.title}
        </h3>
        <EvidenceStatusBadge status={chunk.status} />
      </div>

      <p className="text-sm text-card-foreground/90 leading-relaxed mb-4 border-l-2 border-primary/30 pl-3">
        "{chunk.text}"
      </p>

      {chunk.pageOrSection && (
        <p className="text-xs text-muted-foreground mb-3">
          📄 {chunk.pageOrSection}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {source.authors.length > 0 && (
          <span>{source.authors.join(', ')}</span>
        )}
        {source.publishedDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} aria-hidden="true" />
            {source.publishedDate}
          </span>
        )}
        {source.institution && (
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} aria-hidden="true" />
            {source.institution}
          </span>
        )}
        {source.lastVerified && (
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} aria-hidden="true" />
            Verified {new Date(source.lastVerified).toLocaleDateString()}
          </span>
        )}
        {!source.lastVerified && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <ShieldCheck size={12} aria-hidden="true" />
            Not yet verified
          </span>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
          >
            <ExternalLink size={12} aria-hidden="true" />
            Source
          </a>
        )}
      </div>

      {chunk.relevanceScore !== null && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Relevance</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(chunk.relevanceScore * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Relevance score">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${chunk.relevanceScore * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{Math.round(chunk.relevanceScore * 100)}%</span>
          </div>
        </div>
      )}
    </article>
  );
}
