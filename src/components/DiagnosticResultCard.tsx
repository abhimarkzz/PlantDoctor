import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Shield,
  HelpCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { AnswerResult, EvidenceStatus } from '../models/types';
import { useTranslation } from '../i18n/LanguageContext';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { EvidenceStatusBadge } from './EvidenceStatusBadge';
import { SourceCard } from './SourceCard';

interface DiagnosticResultCardProps {
  result: AnswerResult;
  onAskAnother?: () => void;
  className?: string;
}

const STATUS_ICONS: Record<EvidenceStatus, typeof CheckCircle> = {
  applicable: CheckCircle,
  context_incomplete: AlertTriangle,
  conflicting_evidence: AlertOctagon,
  freshness_unverified: Clock,
  insufficient_evidence: HelpCircle,
};

export function DiagnosticResultCard({
  result,
  onAskAnother,
  className = '',
}: DiagnosticResultCardProps) {
  const { language, t } = useTranslation();
  const [showSources, setShowSources] = useState(false);

  // Construct text to read aloud
  const speechText = result.assessment
    ? `${result.assessment.likelyIssue}. ${result.assessment.recommendedNextSteps.join('. ')}. ${result.summary}`
    : result.summary;

  const { isPlaying, isPaused, hasVoice, isSupported, speak, pause, resume, stop } =
    useTextToSpeech(language);

  const StatusIcon = STATUS_ICONS[result.overallStatus] || CheckCircle;
  const assessment = result.assessment;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* HEADER CARD WITH LISTEN ACTION */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusIcon size={20} className="text-primary shrink-0" aria-hidden="true" />
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground">
              {assessment ? t.diagnosticResult : t.appName}
            </h2>
          </div>
          <EvidenceStatusBadge status={result.overallStatus} />
        </div>

        {/* PROMINENT LISTEN TO ANSWER CONTROL */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Volume2 size={20} className="text-primary shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-foreground">
                {isPlaying ? t.listeningAnswer : t.listenAnswer}
              </p>
              {!hasVoice && (
                <p className="text-[11px] text-muted-foreground">{t.ttsVoiceNotFound}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {!isPlaying ? (
              <button
                type="button"
                onClick={() => speak(speechText)}
                disabled={!isSupported}
                aria-label={t.listenAnswer}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-xs disabled:opacity-40"
              >
                <Play size={14} aria-hidden="true" />
                <span>{t.listenAnswer}</span>
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    type="button"
                    onClick={resume}
                    aria-label={t.resumeAudio}
                    className="p-2 rounded-lg bg-primary text-on-primary hover:bg-primary-dark transition-colors cursor-pointer"
                  >
                    <Play size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pause}
                    aria-label={t.pauseAudio}
                    className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <Pause size={14} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={stop}
                  aria-label={t.stopAudio}
                  className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                  <VolumeX size={14} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* STRUCTURED ASSESSMENT IF PRESENT */}
        {assessment ? (
          <div className="space-y-5 pt-2">
            {/* LIKELY ISSUE / SYMPTOM */}
            <div className="p-4 rounded-xl bg-muted/60 border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                {t.likelyIssue}
              </span>
              <p className="text-base font-bold text-foreground">{assessment.likelyIssue}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.confidence}:</span>
                <span>{assessment.confidenceLevel}</span>
              </div>
            </div>

            {/* VISIBLE OBSERVATIONS */}
            {assessment.visibleObservations.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.observations}
                </h3>
                <ul className="space-y-1.5">
                  {assessment.visibleObservations.map((obs, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1 text-xs">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* POSSIBLE CAUSES */}
            {assessment.possibleCauses.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.possibleCauses}
                </h3>
                <ul className="space-y-1.5">
                  {assessment.possibleCauses.map((cause, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1 text-xs">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* RECOMMENDED NEXT STEPS */}
            {assessment.recommendedNextSteps.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-100">
                <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle size={15} aria-hidden="true" />
                  {t.recommendedSteps}
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-sm">
                  {assessment.recommendedNextSteps.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* SAFETY WARNINGS */}
            {assessment.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={15} aria-hidden="true" />
                  {t.safetyWarnings}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
                  {assessment.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* DIFFERENTIAL CHECKS */}
            {assessment.differentialChecks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.differentialChecks}
                </h3>
                <ul className="space-y-1">
                  {assessment.differentialChecks.map((check, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* STANDARD ANSWER SUMMARY */
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">
            {result.summary}
          </div>
        )}

        {/* CAVEATS */}
        {result.caveats && result.caveats.length > 0 && (
          <div className="p-3 rounded-xl bg-muted/80 border border-border text-xs text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground">{t.noticeHeading}:</span>
            {result.caveats.map((c, i) => (
              <p key={i}>{c}</p>
            ))}
          </div>
        )}
      </div>

      {/* ACTION BUTTONS: ASK ANOTHER & VIEW SOURCES */}
      <div className="flex flex-wrap items-center gap-3">
        {onAskAnother && (
          <button
            type="button"
            onClick={onAskAnother}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-dark transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>{t.askAnother}</span>
          </button>
        )}

        {result.evidenceChunks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSources((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors cursor-pointer"
          >
            <Shield size={16} className="text-primary" aria-hidden="true" />
            <span>{showSources ? t.hideSources : t.viewSources}</span>
            <span className="text-xs text-muted-foreground">({result.evidenceChunks.length})</span>
          </button>
        )}
      </div>

      {/* SOURCES DRAWER */}
      {showSources && result.evidenceChunks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-heading text-base font-bold text-foreground">
            {t.sourcesHeading}
          </h3>
          <div className="space-y-3">
            {result.evidenceChunks.map((chunk) => (
              <SourceCard key={chunk.id} chunk={chunk} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
