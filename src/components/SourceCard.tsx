import { useState } from 'react';
import { ExternalLink, Building2, Calendar, ShieldCheck, FileText, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { EvidenceChunk } from '../models/types';
import { EvidenceStatusBadge } from './EvidenceStatusBadge';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  chunk: EvidenceChunk;
}

const DEMO_CHUNK_TRANSLATIONS: Record<string, Record<string, string>> = {
  'chunk-demo-001': {
    hi: 'नाइट्रोजन की कमी में सबसे पहले पुरानी निचली पत्तियां एकसमान रूप से पीली पड़ने लगती हैं और धीरे-धीरे ऊपर की ओर बढ़ती हैं। लौह (आयरन) की कमी में नई ऊपरी पत्तियों की नसों के बीच का हिस्सा पीला पड़ता है जबकि नसें हरी रहती हैं।',
    te: 'నత్రజని లోపం వల్ల మొదట పాత దిగువ ఆకులు ఏకరూపంలో పసుపు రంగులోకి మారి క్రమంగా పైకి వ్యాపిస్తాయి. ఇనుము లోపం వల్ల పై లేత ఆకుల ఈనెల మధ్య భాగం పసుపు రంగులోకి మారుతుంది, ఈనెలు ఆకుపచ్చగానే ఉంటాయి.',
    ta: 'தழைச்சத்து (நைட்ரஜன்) பற்றாக்குறையின் போது முதலில் முதிர்ந்த கீழ் இலைகள் சீராக மஞ்சள் நிறமாக மாறி படிப்படியாக மேல்நோக்கிப் பரவும். இரும்புச்சத்து குறைபாட்டின் போது இளம் இலைகளின் நரம்புகளுக்கு இடைப்பட்ட பகுதி மஞ்சளாகவும் நரம்புகள் பச்சையாகவும் இருக்கும்.',
  },
  'chunk-demo-002': {
    hi: 'फ्यूजेरियम विल्ट और वर्टिसिलियम विल्ट दोनों से पत्तियां पीली होती हैं, लेकिन आमतौर पर यह पहले पौधे के एक तरफ या कुछ शाखाओं को ही प्रभावित करता है।',
    te: 'ఫ్యుసేరియం విల్ట్ మరియు వర్టిసిలియం విల్ట్ రెండూ ఆకులు పసుపు రంగులోకి మారడానికి కారణమవుతాయి, కానీ సాధారణంగా మొదట మొక్క యొక్క ఒక వైపు లేదా కొన్ని కొమ్మలను మాత్రమే ప్రభావితం చేస్తాయి.',
    ta: 'பியூசேரியம் வாடல் மற்றும் வெர்டிசிலியம் வாடல் ஆகிய இரண்டும் இலைகள் மஞ்சளாவதற்கு காரணமாகின்றன, ஆனால் பொதுவாக முதலில் செடியின் ஒரு பக்கத்தை அல்லது தனிப்பட்ட கிளைகளை மட்டுமே தாக்கும்.',
  },
  'chunk-demo-003': {
    hi: 'मिट्टी में अत्यधिक नमी (जलभराव) से जड़ों में ऑक्सीजन ग्रहण करने की क्षमता घट जाती है, जिससे पत्तियों में पीलापन और जड़ों के सड़ने का खतरा बढ़ जाता है।',
    te: 'నేలలో అధిక తేమ వేర్లకు ప్రాణవాయువు అందకుండా చేస్తుంది, దీనివల్ల ఆకులు పసుపు రంగులోకి మారి వేరు కుళ్లు తెగులు వచ్చే ప్రమాదం ఉంది.',
    ta: 'மண்ணில் அதிகப்படியான ஈரப்பதம் வேர்களின் பிராணவாயு ஏற்பைக் குறைக்கிறது, இது பொதுவான இலை மஞ்சள் நிறத்திற்கும் வேர் அழுகல் நோய்க்கும் வழிவகுக்கும்.',
  },
};

export function SourceCard({ chunk }: Props) {
  const { language, t } = useTranslation();
  const { source } = chunk;
  const [showOriginal, setShowOriginal] = useState(language === 'en');

  // Check for localized explanation
  const localizedExplanation =
    chunk.translatedExplanation ||
    (DEMO_CHUNK_TRANSLATIONS[chunk.id]?.[language] ?? null);

  const hasLocalization = language !== 'en' && Boolean(localizedExplanation);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md space-y-4">
      {/* Top Header with Source Title and Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
              <FileText size={12} aria-hidden="true" />
              <span>{hasLocalization ? t.translatedExplanationLabel : t.originalSourceExcerpt}</span>
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

      {/* Localized Farmer Explanation (if not English and available) */}
      {hasLocalization && localizedExplanation && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            {t.translatedExplanationLabel}
          </p>
          <p className="text-sm text-card-foreground leading-relaxed font-sans">
            {localizedExplanation}
          </p>
        </div>
      )}

      {/* Toggle Button for Original Research Excerpt if Localized */}
      {hasLocalization && (
        <button
          type="button"
          onClick={() => setShowOriginal((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showOriginal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showOriginal ? t.hideOriginalExcerpt : t.viewOriginalExcerpt}</span>
          <span className="text-[11px] text-muted-foreground/80">({t.originalExcerptLabel})</span>
        </button>
      )}

      {/* Verbatim Research Excerpt with Scientific Provenance Marker */}
      {(showOriginal || !hasLocalization) && (
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
          <p className="text-sm text-card-foreground/90 leading-relaxed font-sans border-l-3 border-primary/50 pl-3 italic break-words">
            "{chunk.text}"
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
            <Info size={12} className="text-primary shrink-0" aria-hidden="true" />
            <span>{t.originalSourceNote}</span>
          </p>
        </div>
      )}

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

