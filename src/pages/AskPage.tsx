import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Send,
  ImagePlus,
  X,
  Eye,
  Loader2,
  AlertCircle,
  WifiOff,
  ArrowLeft,
  Mic,
  MicOff,
  Camera,
} from 'lucide-react';
import { activeService, demoService, getLocalizedDemoAnswer } from '../services';
import { BackendUnavailableError, DeviceOfflineError } from '../api/client';
import type { AnswerResult, Question } from '../models/types';
import type { CropContext } from '../components/CropContextFields';
import { CropContextFields } from '../components/CropContextFields';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { ErrorState } from '../components/ErrorState';
import { OfflineServiceScreen } from '../components/OfflineServiceScreen';
import { CardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../i18n/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { LanguageSelector } from '../components/LanguageSelector';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { DiagnosticResultCard } from '../components/DiagnosticResultCard';
import { validateImageFile, processAndCompressImage } from '../utils/imageUtils';

type PageState = 'idle' | 'loading' | 'result' | 'error' | 'offline';

interface AskLocationState {
  context?: CropContext;
  query?: string;
  image?: File | null;
}

export function AskPage() {
  const location = useLocation();
  const incoming = location.state as AskLocationState | null;

  const { language, t } = useTranslation();
  const [query, setQuery] = useState(incoming?.query ?? '');
  const [context, setContext] = useState<CropContext>(
    incoming?.context ?? { cropId: null, regionId: null, growthStageId: null },
  );
  const [image, setImage] = useState<File | null>(incoming?.image ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { notify } = useToast();
  const { add: addRecent } = useRecentActivity();
  const isOnline = useOnlineStatus();

  // Voice-to-Text hook
  const {
    isListening,
    errorCode: speechError,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition(language);

  // Setup preview if incoming image was provided
  useEffect(() => {
    if (incoming?.image) {
      setImage(incoming.image);
      const url = URL.createObjectURL(incoming.image);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [incoming?.image]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Re-localize active result if open when language changes
  const lastLanguageRef = useRef(language);
  useEffect(() => {
    if (lastLanguageRef.current !== language) {
      lastLanguageRef.current = language;
      if (state === 'result' && result) {
        setResult((prev) => (prev ? getLocalizedDemoAnswer(prev, language) : null));
      }
    }
  }, [language, state, result]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || t.errorInvalidImage);
      return;
    }

    try {
      const processed = await processAndCompressImage(file);
      setImage(processed.file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(processed.previewUrl);
    } catch {
      setImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleCameraCapture(capturedFile: File) {
    setImage(capturedFile);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(capturedFile));
  }

  function removeImage() {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
  }

  function toggleVoice() {
    setValidationError(null);
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        setQuery((prev) => (prev ? `${prev} ${text}` : text));
        textareaRef.current?.focus();
      });
    }
  }

  function buildQuestion(): Question {
    return {
      query: query.trim(),
      cropId: context.cropId,
      regionId: context.regionId,
      growthStageId: context.growthStageId,
      hasImage: image !== null,
      language,
    };
  }

  /** Returns true if valid; otherwise sets an inline error and focuses the field. */
  function validate(): boolean {
    const trimmed = query.trim();
    if (trimmed.length === 0 && !image) {
      setValidationError(t.errorEmptyQuestion);
      textareaRef.current?.focus();
      return false;
    }
    if (trimmed.length < 10 && !image) {
      setValidationError(t.errorShortQuestion);
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
      if (err instanceof DeviceOfflineError) {
        setState('offline');
        return;
      }
      if (err instanceof BackendUnavailableError) {
        setErrorMsg(t.backendUnavailableBanner);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t.errorGeneric);
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
      notify(t.illustrativeBannerTitle, 'info');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.errorGeneric);
      setState('error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Language Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
            {t.askDoctor}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            {t.tagline}
          </p>
        </div>
        <LanguageSelector />
      </div>

      {!isOnline && (
        <div
          data-testid="ask-offline-banner"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs md:text-sm text-amber-900"
        >
          <WifiOff size={18} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">{t.askOfflineBannerTitle}</p>
            <p className="text-amber-800/90 leading-relaxed">
              {t.askOfflineBannerDesc}
            </p>
          </div>
        </div>
      )}

      {/* Voice error notice if speech fails */}
      {speechError && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span>
            {speechError === 'permission-denied'
              ? t.micErrorDenied
              : speechError === 'not-supported'
                ? t.micErrorUnsupported
                : speechError === 'no-speech'
                  ? t.micErrorNoSpeech
                  : speechError === 'network'
                    ? t.micErrorNetwork
                    : t.micErrorGeneric}
          </span>
          <button
            type="button"
            onClick={cancelListening}
            className="ml-auto underline cursor-pointer hover:opacity-80"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {state !== 'result' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="question" className="block text-sm font-medium text-foreground">
                {t.yourQuestionLabel}
                {image ? (
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    ({t.optional})
                  </span>
                ) : (
                  <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                )}
              </label>

              {/* Speak button embedded beside field */}
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={isListening}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {isListening ? <MicOff size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
                <span>{isListening ? t.micStop : t.actionSpeak}</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              id="question"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={image ? `${t.checkPlantHealth} — ${t.questionPlaceholder}` : t.questionPlaceholder}
              rows={4}
              required={!image}
              minLength={image ? 0 : 10}
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
              {query.length}/2000 · {t.questionHint}
            </p>
          </div>

          <CropContextFields value={context} onChange={setContext} />

          {/* Photo attachment controls (Camera or Gallery) */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              id="image-upload"
              onChange={handleImageChange}
              className="sr-only"
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleImageChange}
            />

            {!image ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)) {
                      setShowCameraModal(true);
                    } else {
                      nativeCameraInputRef.current?.click();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <Camera size={18} aria-hidden="true" />
                  <span>{t.actionCamera}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <ImagePlus size={18} aria-hidden="true" />
                  <span>{t.actionGallery}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/5">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt={t.imagePreviewAlt}
                    className="h-16 w-16 rounded-xl object-cover border border-border shadow-xs"
                  />
                )}
                <div className="text-sm min-w-0">
                  <p className="text-foreground font-semibold truncate">{image.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.photoAttachedDetail} ({Math.round(image.size / 1024)} KB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                  aria-label={t.removePhoto}
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
              {state === 'loading'
                ? t.searching
                : image && !query.trim()
                ? t.checkPlantHealth
                : t.askBtn}
            </button>
            <button
              type="button"
              onClick={handleViewDemo}
              disabled={state === 'loading'}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
            >
              <Eye size={16} aria-hidden="true" />
              {t.viewIllustrativeExample}
            </button>
          </div>
        </form>
      )}

      {state === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state === 'offline' && (
        <div className="space-y-4" data-testid="ask-offline-screen">
          <OfflineServiceScreen
            title={t.askOfflineScreenTitle}
            message={t.askOfflineScreenMessage}
            onRetry={() => {
              if (navigator.onLine) {
                void runSubmit();
              } else {
                notify(t.offlineNotice, 'info');
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
                  {t.viewIllustrativeExample}
                </button>
                <button
                  type="button"
                  onClick={() => setState('idle')}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  {t.editQuestion}
                </button>
              </div>
            }
          />
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <ErrorState title={t.errorGeneric} message={errorMsg} onRetry={() => void runSubmit()} />
          <div className="text-center">
            <button
              type="button"
              onClick={handleViewDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Eye size={16} aria-hidden="true" />
              {t.viewIllustrativeExample}
            </button>
          </div>
        </div>
      )}

      {state === 'result' && result && (
        <div className="space-y-6">
          {result.isIllustrative && <IllustrativeBanner />}

          {/* DIAGNOSTIC RESULT CARD WITH LISTEN ACTION & STRUCTURED ASSESSMENT */}
          <DiagnosticResultCard
            result={result}
            onAskAnother={() => {
              setState('idle');
              setResult(null);
            }}
          />

          <Link
            to={`/evidence/${result.id}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            {t.viewFullEvidenceDetails}
          </Link>
        </div>
      )}

      {/* CAMERA MODAL */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
