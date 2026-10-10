import { Shield, AlertTriangle, Database, Leaf, BookCheck, Scale } from 'lucide-react';
import { EVIDENCE_STATUS_META } from '../models/types';
import type { EvidenceStatus } from '../models/types';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function AboutPage() {
  const { t } = useTranslation();

  const trustItems = [
    t.aboutTrustItem1,
    t.aboutTrustItem2,
    t.aboutTrustItem3,
    t.aboutTrustItem4,
    t.aboutTrustItem5,
  ];

  const archItems = [
    t.aboutArchItem1,
    t.aboutArchItem2,
    t.aboutArchItem3,
    t.aboutArchItem4,
    t.aboutArchItem5,
  ];

  const limitItems = [
    t.aboutLimitsItem1,
    t.aboutLimitsItem2,
    t.aboutLimitsItem3,
    t.aboutLimitsItem4,
    t.aboutLimitsItem5,
  ];

  const ethicsItems = [
    t.aboutEthicsItem1,
    t.aboutEthicsItem2,
    t.aboutEthicsItem3,
    t.aboutEthicsItem4,
    t.aboutEthicsItem5,
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header and Language Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t.aboutTitle}
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            {t.aboutSubtitle}
          </p>
        </div>
        <LanguageSelector />
      </div>

      {/* Mission */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Leaf size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {t.aboutMissionTitle}
          </h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed">
          {t.aboutMissionDesc}
        </p>
      </section>

      {/* Evidence Status Gate */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t.aboutGateTitle}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.aboutGateDesc}
        </p>
        <div className="space-y-3 pt-1">
          {(Object.keys(EVIDENCE_STATUS_META) as EvidenceStatus[]).map((key) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <EvidenceStatusBadge status={key} className="shrink-0" />
              <p className="text-xs sm:text-sm text-card-foreground/80 leading-relaxed">
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
      </section>

      {/* Source trust & provenance */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <BookCheck size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {t.aboutTrustTitle}
          </h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed mb-3">
          {t.aboutTrustDesc}
        </p>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {trustItems.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary font-bold shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Architecture */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Database size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {t.aboutArchTitle}
          </h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed mb-3">
          {t.aboutArchDesc}
        </p>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {archItems.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-secondary font-bold shrink-0">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Operational Boundaries & Safety Warnings (High Contrast) */}
      <section className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-amber-800 dark:text-amber-400" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-amber-950 dark:text-amber-100">
            {t.aboutLimitsTitle}
          </h2>
        </div>
        <ul className="text-sm text-amber-900 dark:text-amber-200 space-y-2.5">
          {limitItems.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* PWA Installation & Offline Shell */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs" data-testid="pwa-install-guide">
        <div className="flex items-center gap-2 mb-1">
          <Leaf size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {t.aboutPwaTitle}
          </h2>
        </div>
        <p className="text-sm text-card-foreground/90 leading-relaxed">
          {t.aboutPwaDesc}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Android */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
            <h3 className="font-heading font-semibold text-sm text-foreground">
              {t.aboutPwaAndroidTitle}
            </h3>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
              <li>{t.aboutPwaAndroidStep1}</li>
              <li>{t.aboutPwaAndroidStep2}</li>
              <li>{t.aboutPwaAndroidStep3}</li>
              <li>{t.aboutPwaAndroidStep4}</li>
            </ol>
          </div>

          {/* iOS */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
            <h3 className="font-heading font-semibold text-sm text-foreground">
              {t.aboutPwaIosTitle}
            </h3>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
              <li>{t.aboutPwaIosStep1}</li>
              <li>{t.aboutPwaIosStep2}</li>
              <li>{t.aboutPwaIosStep3}</li>
              <li>{t.aboutPwaIosStep4}</li>
            </ol>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
          {t.aboutPwaNote}
        </p>
      </section>

      {/* Ethics */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={20} className="text-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {t.aboutEthicsTitle}
          </h2>
        </div>
        <ul className="text-sm text-card-foreground/80 space-y-2">
          {ethicsItems.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary font-bold shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground text-center py-4">
        {t.aboutVersionBadge}
      </p>
    </div>
  );
}
