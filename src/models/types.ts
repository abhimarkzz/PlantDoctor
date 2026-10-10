/** Evidence status labels — describes intended system behavior */
export type EvidenceStatus =
  | 'applicable'
  | 'context_incomplete'
  | 'conflicting_evidence'
  | 'freshness_unverified'
  | 'insufficient_evidence';

export const EVIDENCE_STATUS_META: Record<
  EvidenceStatus,
  { label: string; description: string; color: string; icon: string }
> = {
  applicable: {
    label: 'Applicable',
    description: 'Evidence matches the described context and has been verified within its freshness window.',
    color: 'var(--color-evidence-applicable)',
    icon: 'check-circle',
  },
  context_incomplete: {
    label: 'Context Incomplete',
    description: 'Some information needed to fully assess applicability is missing. Ask follow-up questions.',
    color: 'var(--color-evidence-incomplete)',
    icon: 'alert-triangle',
  },
  conflicting_evidence: {
    label: 'Conflicting Evidence',
    description: 'Multiple sources provide contradictory guidance for this situation.',
    color: 'var(--color-evidence-conflicting)',
    icon: 'alert-octagon',
  },
  freshness_unverified: {
    label: 'Freshness Unverified',
    description: 'This evidence has not been re-verified within its expected update cycle.',
    color: 'var(--color-evidence-unverified)',
    icon: 'clock',
  },
  insufficient_evidence: {
    label: 'Insufficient Evidence',
    description: 'Not enough sources were found to provide reliable guidance.',
    color: 'var(--color-evidence-insufficient)',
    icon: 'help-circle',
  },
};

/** A structured question submitted to the Plant Doctor */
export interface Question {
  query: string;
  cropId: string | null;
  regionId: string | null;
  growthStageId: string | null;
  hasImage: boolean;
  language?: string;
}

/** A single source document */
export interface Source {
  id: string;
  /** Human-facing source identifier (e.g. catalogue/DOI-style ref) */
  identifier: string | null;
  title: string;
  authors: string[];
  publishedDate: string | null;
  url: string | null;
  institution: string | null;
  /** ISO timestamp of last verification */
  lastVerified: string | null;
}

/** Alias used across evidence APIs */
export type EvidenceSource = Source;

/** A chunk of evidence retrieved from a source */
export interface EvidenceChunk {
  id: string;
  sourceId: string;
  source: Source;
  text: string;
  status: EvidenceStatus;
  relevanceScore: number | null;
  pageOrSection: string | null;
  translatedExplanation?: string | null;
}

export interface MultimodalAssessmentResult {
  id: string;
  query: string;
  likelyIssue: string;
  visibleObservations: string[];
  possibleCauses: string[];
  differentialChecks: string[];
  recommendedNextSteps: string[];
  warnings: string[];
  confidenceLevel: string;
  missingContext: string[];
  overallStatus: EvidenceStatus;
  statusReason?: string | null;
  evidenceChunks: EvidenceChunk[];
  caveats: string[];
  language: string;
  visionModelStatus: string;
  imageAttached: boolean;
  generatedAt: string;
}

/** The complete answer result from the backend */
export interface AnswerResult {
  id: string;
  query: string;
  summary: string;
  overallStatus: EvidenceStatus;
  evidenceChunks: EvidenceChunk[];
  caveats: string[];
  generatedAt: string;
  isIllustrative: boolean;
  assessment?: MultimodalAssessmentResult;
  responseLanguage?: string;
}

/** Knowledge pack for offline use */
export interface KnowledgePack {
  id: string;
  name: string;
  description: string;
  version: string;
  region: string | null;
  cropCategories: string[];
  sizeBytes: number;
  sourceCount: number;
  /** ISO timestamp the pack contents were last updated at the source. */
  lastUpdated: string;
  /** ISO timestamp this device last synchronized the pack, or null if never. */
  lastSynced: string | null;
  /** ISO timestamp the pack's sources were last verified, or null if unknown. */
  lastVerified: string | null;
  status: 'available' | 'downloading' | 'downloaded' | 'update_available';
}

/** Manifest for a knowledge pack version */
export interface PackManifest {
  packId: string;
  version: string;
  checksum: string;
  chunks: number;
  sources: number;
  createdAt: string;
}

/** Backend health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  mongoConnected: boolean;
}
