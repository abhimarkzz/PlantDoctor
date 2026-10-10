import {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { EvidenceStatus } from '../models/types';
import { useTranslation } from '../i18n/LanguageContext';

const ICON_MAP: Record<EvidenceStatus, typeof CheckCircle> = {
  applicable: CheckCircle,
  context_incomplete: AlertTriangle,
  conflicting_evidence: AlertOctagon,
  freshness_unverified: Clock,
  insufficient_evidence: HelpCircle,
};

const BG_MAP: Record<EvidenceStatus, string> = {
  applicable: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
  context_incomplete: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  conflicting_evidence: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  freshness_unverified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  insufficient_evidence: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

interface Props {
  status: EvidenceStatus;
  showDescription?: boolean;
  className?: string;
}

export function EvidenceStatusBadge({ status, showDescription = false, className = '' }: Props) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[status];

  const labelMap: Record<EvidenceStatus, string> = {
    applicable: t.statusApplicable,
    context_incomplete: t.statusContextIncomplete,
    conflicting_evidence: t.statusConflicting,
    freshness_unverified: t.statusFreshnessUnverified,
    insufficient_evidence: t.statusInsufficient,
  };

  const descMap: Record<EvidenceStatus, string> = {
    applicable: t.statusApplicableDesc,
    context_incomplete: t.statusContextIncompleteDesc,
    conflicting_evidence: t.statusConflictingDesc,
    freshness_unverified: t.statusFreshnessUnverifiedDesc,
    insufficient_evidence: t.statusInsufficientDesc,
  };

  const label = labelMap[status];
  const description = descMap[status];

  return (
    <div className={className}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs md:text-sm font-semibold ${BG_MAP[status]}`}
        role="status"
        aria-label={`Evidence status: ${label}`}
      >
        <Icon size={16} aria-hidden="true" />
        {label}
      </span>
      {showDescription && (
        <p className="mt-1.5 text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
    </div>
  );
}
