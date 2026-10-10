import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Clean up stream if modal closed
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(t.cameraNotSupported);
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError(t.cameraPermissionDenied);
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError(t.cameraNotFound);
        } else {
          setCameraError(error.message || t.errorGeneric);
        }
      }
    }

    void startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode, t]);

  function takeSnapshot() {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `plant_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        // Stop stream and notify
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.9,
    );
  }

  function toggleCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.actionCamera}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-primary" aria-hidden="true" />
            <h2 className="font-heading text-base font-semibold text-foreground">
              {t.actionCamera}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cameraClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle size={40} className="mx-auto text-destructive" aria-hidden="true" />
              <p className="text-sm text-destructive-foreground font-medium">{cameraError}</p>
              <p className="text-xs text-muted-foreground">
                {t.cameraGalleryAlternative}
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              {/* Grid overlay for diagnostic leaf framing */}
              <div className="absolute inset-0 border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40" />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-card flex items-center justify-around border-t border-border">
          <button
            type="button"
            onClick={toggleCamera}
            disabled={Boolean(cameraError)}
            aria-label={t.cameraSwitch}
            className="p-3 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={20} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={takeSnapshot}
            disabled={Boolean(cameraError)}
            aria-label={t.cameraTakePicture}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-on-primary ring-4 ring-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-40"
          >
            <Camera size={28} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 cursor-pointer"
          >
            {t.cameraCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
