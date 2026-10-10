import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, ImagePlus, X, Eye, Loader2, AlertCircle, WifiOff, ArrowLeft } from 'lucide-react';
import { activeService, demoService } from '../services';
import { BackendUnavailableError, DeviceOfflineError } from '../api/client';
import type { AnswerResult, Question } from '../models/types';
import type { CropContext } from '../components/CropContextFields';
import { CropContextFields } from '../components/CropContextFields';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';
import { SourceCard } from '../components/SourceCard';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { ErrorState } from '../components/ErrorState';
import { OfflineServiceScreen } from '../components/OfflineServiceScreen';
import { CardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type PageState = 'idle' | 'loading' | 'result' | 'error' | 'offline';

interface AskLocationState {
  context?: CropContext;
  query?: string;
}

export function AskPage() {
  const location = useLocation();
  const incoming = location.state as AskLocationState | null;

  const [query, setQuery] = useState(incoming?.query ?? '');
  const [context, setContext] = useState<CropContext>(
    incoming?.context ?? { cropId: null, regionId: null, growthStageId: null },
  );
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { notify } = useToast();
  const { add: addRecent } = useRecentActivity();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function removeImage() {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function buildQuestion(): Question {
    return {
      query: query.trim(),
      cropId: context.cropId,
      regionId: context.regionId,
      growthStageId: context.growthStageId,
      hasImage: image !== null,
    };
  }

  /** Returns true if valid; otherwise sets an inline error and focuses the field. */
  function validate(): boolean {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setValidationError('Please enter a question before submitting.');
      textareaRef.current?.focus();
      return false;
    }
    if (trimmed.length < 10) {
      setValidationError('Your question is too short — please add more detail (at least 10 characters).');
      textareaRef.current?.focus();
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function runSubmit() {
    if (!validate()) return;
    const question = buildQuestion();

    setState('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const answer = await activeService.ask(question, image ?? undefined);
      setResult(answer);
      setState('result');
      addRecent({
        query: question.query,
        cropId: question.cropId,
        regionId: question.regionId,
        illustrative: answer.isIllustrative,
      });
    } catch (err) {
      if (err instanceof DeviceOfflineError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setState('offline');
        return;
      }
      if (err instanceof BackendUnavailableError) {
        setErrorMsg('The backend is not connected, so no real evidence can be retrieved. You can view a clearly-labelled illustrative example instead.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
      setState('error');
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runSubmit();
  }

  async function handleViewDemo() {
    if (!validate()) return;
    const question = buildQuestion();
    setState('loading');
    try {
      const answer = await demoService.ask(question);
      setResult(answer);
      setState('result');
      addRecent({
        query: question.query,
        cropId: question.cropId,
        regionId: question.regionId,
        illustrative: true,
      });
      notify('Showing an illustrative example — not real guidance.', 'info');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load illustrative example.');
      setState('error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          Ask Plant Doctor
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe a plant health issue. Crop and region help assess how applicable the evidence is.
        </p>
      </div>

      {!isOnline && (
        <div
          data-testid="ask-offline-banner"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs md:text-sm text-amber-900"
        >
          <WifiOff size={18} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">Device is offline — Application shell cached</p>
            <p className="text-amber-800/90 leading-relaxed">
              You can draft questions and test the context form while offline. Live question submission requires an active network connection. You can also view offline illustrative examples.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-foreground mb-1.5">
            Your question
            <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
          </label>
          <textarea
            ref={textareaRef}
            id="question"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. My tomato plants have yellowing lower leaves and the stems show brown streaks…"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            aria-invalid={validationError !== null}
            aria-describedby={validationError ? 'question-error question-hint' : 'question-hint'}
            className={`w-full rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-y ${
              validationError ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
            }`}
          />
          {validationError && (
            <p id="question-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle size={14} aria-hidden="true" />
              {validationError}
            </p>
          )}
          <p id="question-hint" className="mt-1 text-xs text-muted-foreground">
            {query.length}/2000 characters · Minimum 10 characters
          </p>
        </div>

        <CropContextFields value={context} onChange={setContext} />

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            id="image-upload"
            onChange={handleImageChange}
            className="sr-only"
          />
          {!image ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <ImagePlus size={18} aria-hidden="true" />
              Attach photo (optional)
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Attached plant photo preview"
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
              )}
              <div className="text-sm min-w-0">
                <p className="text-foreground font-medium truncate">{image.name}</p>
                <p className="text-xs text-muted-foreground">
                  Attached for context — this does <strong>not</strong> perform diagnosis.
                  No inference model is running.
                </p>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors cursor-pointer"
                aria-label="Remove attached image"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {state === 'loading' ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
            {state === 'loading' ? 'Searching…' : 'Ask'}
          </button>
          <button
            type="button"
            onClick={handleViewDemo}
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
          >
            <Eye size={16} aria-hidden="true" />
            View illustrative example
          </button>
        </div>
      </form>

      {state === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state === 'offline' && (
        <div className="space-y-4" data-testid="ask-offline-screen">
          <OfflineServiceScreen
            title="Question submission unavailable offline"
            message="You are currently offline. Querying live agricultural evidence requires an active network connection to reach the backend services. Your question draft has been preserved so you can submit as soon as connectivity is restored."
            onRetry={() => {
              if (navigator.onLine) {
                void runSubmit();
              } else {
                notify('Still offline. Please reconnect to the internet to submit.', 'info');
              }
            }}
            secondaryAction={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewDemo}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Eye size={16} aria-hidden="true" />
                  View illustrative example
                </button>
                <button
                  type="button"
                  onClick={() => setState('idle')}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Edit question
                </button>
              </div>
            }
          />
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <ErrorState title="Cannot reach backend" message={errorMsg} onRetry={() => void runSubmit()} />
          <div className="text-center">
            <button
              type="button"
              onClick={handleViewDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Eye size={16} aria-hidden="true" />
              View illustrative example
            </button>
          </div>
        </div>
      )}

      {state === 'result' && result && (
        <div className="space-y-6">
          {result.isIllustrative && <IllustrativeBanner />}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <h2 className="font-heading text-lg font-semibold text-card-foreground">Summary</h2>
              <EvidenceStatusBadge status={result.overallStatus} />
            </div>
            <p className="text-sm text-card-foreground/90 leading-relaxed">{result.summary}</p>

            {result.caveats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Caveats</p>
                <ul className="space-y-1">
                  {result.caveats.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
              Supporting evidence ({result.evidenceChunks.length} sources)
            </h2>
            <div className="space-y-4">
              {result.evidenceChunks.map((chunk) => (
                <SourceCard key={chunk.id} chunk={chunk} />
              ))}
            </div>
          </div>

          <Link
            to={`/evidence/${result.id}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            View full evidence details →
          </Link>
        </div>
      )}
    </div>
  );
}
