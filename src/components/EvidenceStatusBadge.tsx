import {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { EvidenceStatus } from '../models/types';
import { EVIDENCE_STATUS_META } from '../models/types';

const ICON_MAP: Record<EvidenceStatus, typeof CheckCircle> = {
  applicable: CheckCircle,
  context_incomplete: AlertTriangle,
  conflicting_evidence: AlertOctagon,
  freshness_unverified: Clock,
  insufficient_evidence: HelpCircle,
};

const BG_MAP: Record<EvidenceStatus, string> = {
  applicable: 'bg-green-100 text-green-800',
  context_incomplete: 'bg-amber-100 text-amber-800',
  conflicting_evidence: 'bg-red-100 text-red-800',
  freshness_unverified: 'bg-indigo-100 text-indigo-800',
  insufficient_evidence: 'bg-gray-100 text-gray-600',
};

interface Props {
  status: EvidenceStatus;
  showDescription?: boolean;
  className?: string;
}

export function EvidenceStatusBadge({ status, showDescription = false, className = '' }: Props) {
  const meta = EVIDENCE_STATUS_META[status];
  const Icon = ICON_MAP[status];

  return (
    <div className={className}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${BG_MAP[status]}`}
        role="status"
        aria-label={`Evidence status: ${meta.label}`}
      >
        <Icon size={16} aria-hidden="true" />
        {meta.label}
      </span>
      {showDescription && (
        <p className="mt-1.5 text-sm text-muted-foreground">{meta.description}</p>
      )}
    </div>
  );
}
