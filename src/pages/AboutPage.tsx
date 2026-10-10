import { Shield, AlertTriangle, Database, Leaf, BookCheck, Scale, FileWarning } from 'lucide-react';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';

export function AboutPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          About Plant Doctor
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          An offline-first, evidence-grounded agricultural assistant that helps users access
          traceable agricultural guidance and understand when the available evidence is
          incomplete, conflicting, outdated, or unsuitable for their situation.
        </p>
      </div>

      {/* Mission */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Leaf size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">Mission</h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed">
          Plant Doctor aims to provide smallholder farmers and agricultural advisors with
          credible, source-traceable crop health guidance — even in low-connectivity environments.
          Every recommendation is grounded in identifiable evidence, and every limitation
          is made visible rather than hidden.
        </p>
      </section>

      {/* Evidence Status Gate */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Evidence Status Gate</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          The Evidence Status Gate is a planned feature that labels every piece of guidance with
          one of five evidence statuses. These describe <strong>intended system behavior</strong> —
          they are not yet scientifically validated until the corresponding backend exists and passes tests.
        </p>
        <div className="space-y-3">
          {(Object.entries(EVIDENCE_STATUS_META) as [EvidenceStatus, typeof EVIDENCE_STATUS_META[EvidenceStatus]][]).map(
            ([key, meta]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 rounded-xl border border-border bg-card p-4">
                <EvidenceStatusBadge status={key} className="shrink-0" />
                <p className="text-sm text-card-foreground/80 leading-relaxed">{meta.description}</p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Source trust */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookCheck size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">Source trust & provenance</h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed mb-3">
          When the backend is connected, every piece of evidence will show:
        </p>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {[
            'The original source title, authors, and publishing institution.',
            'The publication date and the date the source was last verified.',
            'The specific page, section, or chunk the evidence was extracted from.',
            'A relevance score indicating how closely it matches the query context.',
            'An evidence status reflecting the quality and applicability assessment.',
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary font-bold shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Architecture */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Database size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">Planned architecture</h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed mb-3">
          The full system will use:
        </p>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {[
            'FastAPI for the REST API layer.',
            'MongoDB Atlas for agricultural sources, evidence chunks, embeddings, source versions, and applicability metadata.',
            'Versioned offline knowledge packs with manifests and checksums.',
            'Retrieval-augmented generation with source attribution.',
            'An IndexedDB-based local evidence store for offline queries.',
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-secondary font-bold shrink-0">→</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3 italic">
          None of these backend components are connected in the current frontend milestone.
        </p>
      </section>

      {/* Limitations */}
      <section className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-amber-600" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Current limitations</h2>
        </div>
        <ul className="text-sm text-foreground/80 space-y-2">
          {[
            'No backend, database, or model is connected.',
            'All example data is clearly labelled as illustrative.',
            'Image upload does not perform diagnosis — no inference model is running.',
            'Offline knowledge packs are not downloadable or locally searchable.',
            'Evidence status labels describe intended behavior, not validated functionality.',
            'The service worker caches the application shell only — it does not enable offline question answering.',
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <FileWarning size={14} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Ethics */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">Ethical commitments</h2>
        </div>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {[
            'Never fabricate agricultural guidance or invent source citations.',
            'Always show when evidence is insufficient, conflicting, or outdated.',
            'Never present a photo upload as a confirmed diagnosis.',
            'Clearly distinguish illustrative examples from real evidence.',
            'Make offline limitations visible rather than hiding them.',
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary font-bold shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground text-center py-4">
        Plant Doctor v0.1.0 — Frontend milestone
      </p>
    </div>
  );
}
