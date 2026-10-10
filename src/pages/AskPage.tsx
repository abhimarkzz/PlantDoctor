import { useState, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send, ImagePlus, X, Eye, Loader2 } from 'lucide-react';
import { askQuestion, BackendUnavailableError } from '../api/client';
import type { AnswerResult } from '../models/types';
import { DEMO_ANSWER } from '../demo/fixtures';
import { EvidenceStatusBadge } from '../components/EvidenceStatusBadge';
import { SourceCard } from '../components/SourceCard';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { ErrorState } from '../components/ErrorState';
import { CardSkeleton } from '../components/Skeleton';

type PageState = 'idle' | 'loading' | 'result' | 'error';

export function AskPage() {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  function removeImage() {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setState('loading');
    setResult(null);
    setShowDemo(false);
    setErrorMsg('');

    try {
      const answer = await askQuestion(trimmed, image ?? undefined);
      setResult(answer);
      setState('result');
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setErrorMsg('The backend is not connected. You can view an illustrative example instead.');
        setState('error');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
        setState('error');
      }
    }
  }

  function handleViewDemo() {
    setResult(DEMO_ANSWER);
    setShowDemo(true);
    setState('result');
  }

  const displayResult = result;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          Ask Plant Doctor
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe a plant health issue — include crop type, symptoms, location, and timing for more relevant guidance.
        </p>
      </div>

      {/* Question form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-foreground mb-1.5">
            Your question
          </label>
          <textarea
            id="question"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. My tomato plants have yellowing lower leaves and the stems show brown streaks…"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {query.length}/2000 characters · Minimum 10 characters
          </p>
        </div>

        {/* Image attachment */}
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
                  alt="Attached plant photo"
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
              )}
              <div className="text-sm">
                <p className="text-foreground font-medium">{image.name}</p>
                <p className="text-xs text-muted-foreground">
                  Photo attached — this does <strong>not</strong> perform diagnosis.
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
            disabled={query.trim().length < 10 || state === 'loading'}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {state === 'loading' ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
            {state === 'loading' ? 'Searching…' : 'Ask'}
          </button>
        </div>
      </form>

      {/* Loading */}
      {state === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error with demo option */}
      {state === 'error' && (
        <div className="space-y-4">
          <ErrorState
            title="Cannot reach backend"
            message={errorMsg}
            onRetry={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
          />
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

      {/* Result */}
      {state === 'result' && displayResult && (
        <div className="space-y-6">
          {(displayResult.isIllustrative || showDemo) && <IllustrativeBanner />}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <h2 className="font-heading text-lg font-semibold text-card-foreground">Summary</h2>
              <EvidenceStatusBadge status={displayResult.overallStatus} />
            </div>
            <p className="text-sm text-card-foreground/90 leading-relaxed">{displayResult.summary}</p>

            {displayResult.caveats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Caveats</p>
                <ul className="space-y-1">
                  {displayResult.caveats.map((c, i) => (
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
              Supporting evidence ({displayResult.evidenceChunks.length} sources)
            </h2>
            <div className="space-y-4">
              {displayResult.evidenceChunks.map((chunk) => (
                <SourceCard key={chunk.id} chunk={chunk} />
              ))}
            </div>
          </div>

          <Link
            to={`/evidence/${displayResult.id}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            View full evidence details →
          </Link>
        </div>
      )}

      {/* Idle state hint */}
      {state === 'idle' && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            The backend is not connected in this milestone.{' '}
            <button
              type="button"
              onClick={handleViewDemo}
              className="text-primary hover:underline cursor-pointer font-medium"
            >
              View an illustrative example
            </button>{' '}
            to see how results will appear.
          </p>
        </div>
      )}
    </div>
  );
}
