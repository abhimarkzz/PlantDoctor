import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Mic, MicOff, Camera, ImagePlus, X, RefreshCw, Send, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CropContextFields, type CropContext } from './CropContextFields';
import { validateImageFile, processAndCompressImage } from '../utils/imageUtils';

interface FarmerInputSectionProps {
  initialQuery?: string;
  initialImage?: File | null;
  initialContext?: CropContext;
  isSubmitting?: boolean;
  onSubmit: (query: string, image: File | null, context: CropContext) => void | Promise<void>;
  className?: string;
}

export function FarmerInputSection({
  initialQuery = '',
  initialImage = null,
  initialContext = { cropId: null, regionId: null, growthStageId: null },
  isSubmitting = false,
  onSubmit,
  className = '',
}: FarmerInputSectionProps) {
  const { language, t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [context, setContext] = useState<CropContext>(initialContext);
  const [image, setImage] = useState<File | null>(initialImage);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showContextOptions, setShowContextOptions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    errorCode: speechError,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition(language);

  // Sync initial query
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  // Sync initial image
  useEffect(() => {
    if (initialImage) {
      setImage(initialImage);
      const url = URL.createObjectURL(initialImage);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [initialImage]);

  // Clean preview URLs
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || t.errorInvalidImage);
      return;
    }

    setValidationError(null);
    try {
      const processed = await processAndCompressImage(file);
      setImage(processed.file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(processed.previewUrl);
    } catch {
      // Fallback to raw file if compression fails
      setImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleCameraCapture(capturedFile: File) {
    setImage(capturedFile);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(capturedFile));
    setValidationError(null);
  }

  function removeImage() {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
  }

  function toggleVoiceRecording() {
    setValidationError(null);
    if (isListening) {
      stopListening();
    } else {
      startListening((finalTranscript) => {
        setQuery((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        textareaRef.current?.focus();
      });
    }
  }

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed && !image) {
      setValidationError(t.errorEmptyQuestion);
      textareaRef.current?.focus();
      return;
    }

    if (trimmed && trimmed.length < 5 && !image) {
      setValidationError(t.errorShortQuestion);
      textareaRef.current?.focus();
      return;
    }

    setValidationError(null);
    const finalQuery = trimmed || (image ? t.defaultPhotoQuery : '');
    onSubmit(finalQuery, image, context);
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hidden file inputs for Camera and Gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* THREE PROMINENT ACTIONS FOR FARMERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* ACTION 1: SPEAK */}
        <button
          type="button"
          onClick={toggleVoiceRecording}
          disabled={isSubmitting}
          aria-pressed={isListening}
          aria-label={t.actionSpeak}
          className={`flex sm:flex-col items-center justify-start sm:justify-center gap-3 p-4 rounded-2xl border transition-all text-left sm:text-center cursor-pointer shadow-xs min-h-[72px] sm:min-h-[140px] ${
            isListening
              ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/30 animate-pulse'
              : 'bg-card border-border hover:border-primary/40 hover:bg-muted/50 text-foreground'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-primary/10 text-primary'
            }`}
          >
            {isListening ? <MicOff size={24} aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
          </div>
          <div>
            <span className="block font-heading font-bold text-base leading-tight">
              {isListening ? t.micStop : t.actionSpeak}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {isListening ? t.micListening : t.actionSpeakDesc}
            </span>
          </div>
        </button>

        {/* ACTION 2: TAKE A PHOTO */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)) {
              setShowCameraModal(true);
            } else {
              nativeCameraInputRef.current?.click();
            }
          }}
          disabled={isSubmitting}
          aria-label={t.actionCamera}
          className="flex sm:flex-col items-center justify-start sm:justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-all text-left sm:text-center cursor-pointer shadow-xs min-h-[72px] sm:min-h-[140px] text-foreground"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Camera size={24} aria-hidden="true" />
          </div>
          <div>
            <span className="block font-heading font-bold text-base leading-tight">
              {t.actionCamera}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {t.actionCameraDesc}
            </span>
          </div>
        </button>

        {/* ACTION 3: CHOOSE PHOTO FROM GALLERY */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isSubmitting}
          aria-label={t.actionGallery}
          className="flex sm:flex-col items-center justify-start sm:justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-all text-left sm:text-center cursor-pointer shadow-xs min-h-[72px] sm:min-h-[140px] text-foreground"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <ImagePlus size={24} aria-hidden="true" />
          </div>
          <div>
            <span className="block font-heading font-bold text-base leading-tight">
              {t.actionGallery}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {t.actionGalleryDesc}
            </span>
          </div>
        </button>
      </div>

      {/* SPEECH ERROR BANNER IF ANY */}
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

      {/* SELECTED IMAGE PREVIEW CARD */}
      {imagePreview && (
        <div className="flex items-center gap-4 p-3 rounded-2xl border border-primary/30 bg-primary/5">
          <img
            src={imagePreview}
            alt={t.imagePreviewAlt}
            className="w-20 h-20 rounded-xl object-cover border border-border shrink-0 shadow-xs"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>{t.photoAttached}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({image ? Math.round(image.size / 1024) : 0} KB)
              </span>
            </p>
            <p className="text-xs text-muted-foreground truncate">{image?.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)) {
                    setShowCameraModal(true);
                  } else {
                    nativeCameraInputRef.current?.click();
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <RefreshCw size={12} aria-hidden="true" />
                {t.retakePhoto}
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <button
                type="button"
                onClick={removeImage}
                className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline cursor-pointer"
              >
                <X size={12} aria-hidden="true" />
                {t.removePhoto}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION INPUT TEXTAREA */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
        <label htmlFor="farmer-question-input" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t.startQuestion}
        </label>
        <textarea
          id="farmer-question-input"
          ref={textareaRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder={t.questionPlaceholder}
          aria-label={t.describeProblemAria || 'Describe or Speak the Problem'}
          rows={3}
          disabled={isSubmitting}
          className="w-full bg-transparent resize-none text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />

        {/* Validation message */}
        {validationError && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertCircle size={14} aria-hidden="true" />
            {validationError}
          </p>
        )}

        {/* OPTIONAL CROP CONTEXT ACCORDION */}
        <div className="border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setShowContextOptions((prev) => !prev)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{showContextOptions ? t.hideCropRegion : t.addCropRegionOptional}</span>
          </button>
          {showContextOptions && (
            <div className="mt-3 pt-2">
              <CropContextFields value={context} onChange={setContext} />
            </div>
          )}
        </div>
      </div>

      {/* PROMINENT SUBMIT ACTION */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full min-h-[52px] rounded-2xl bg-primary text-on-primary font-heading font-bold text-base flex items-center justify-center gap-2 shadow-md hover:bg-primary-dark active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            <span>{t.submitting}</span>
          </>
        ) : (
          <>
            <Send size={18} aria-hidden="true" />
            <span>{t.askDoctor}</span>
          </>
        )}
      </button>

      {/* CAMERA MODAL */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
