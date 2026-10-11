import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  HardDrive,
  MapPin,
  ArrowRight,
  ServerOff,
  Eye,
  Search,
  Inbox,
  WifiOff,
  Cpu,
  ShieldCheck,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Sparkles,
} from 'lucide-react';
import { activeService, demoService } from '../services';
import { BackendUnavailableError, DeviceOfflineError } from '../api/client';
import type { KnowledgePack } from '../models/types';
import {
  downloadAndInstallOfflineModel,
  removeOfflineModel,
  getOfflineAIReadiness,
  type OfflineAIReadiness,
  EXPECTED_MODEL_SHA256,
} from '../services/offlineStorage';
import { resetLocalInferenceSession } from '../services/localInference';
import { CardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { OfflineServiceScreen } from '../components/OfflineServiceScreen';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { useToast } from '../components/Toast';

type LibraryState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'offline' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryPage() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const { notify } = useToast();

  const [state, setState] = useState<LibraryState>('loading');
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  // Offline AI Model & Readiness
  const [readiness, setReadiness] = useState<OfflineAIReadiness | null>(null);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelActionError, setModelActionError] = useState<string | null>(null);

  async function load() {
    try {
      const currentReadiness = await getOfflineAIReadiness();
      setReadiness(currentReadiness);
    } catch (e) {
      console.warn('Readiness check warning:', e);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const localPacks = await activeService.listPacks();
        setPacks(localPacks);
        setState(localPacks.length === 0 ? 'offline' : 'ready');
      } catch {
        setState('offline');
      }
      setIsPreview(false);
      return;
    }

    setState('loading');
    setIsPreview(false);
    try {
      const result = await activeService.listPacks();
      setPacks(result);
      setState(result.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (err instanceof DeviceOfflineError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        try {
          const localPacks = await activeService.listPacks();
          setPacks(localPacks);
          setState(localPacks.length === 0 ? 'offline' : 'ready');
        } catch {
          setState('offline');
        }
      } else if (err instanceof BackendUnavailableError) {
        try {
          const localPacks = await activeService.listPacks();
          if (localPacks.length > 0) {
            setPacks(localPacks);
            setState('ready');
            return;
          }
        } catch {}
        setState('unavailable');
      } else {
        setErrorMsg(err instanceof Error ? err.message : t.errorGeneric);
        setState('error');
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handlePrepareOfflineAI() {
    setIsDownloadingModel(true);
    setDownloadProgress(0);
    setModelActionError(null);
    try {
      notify('Starting on-device AI model download…', 'info');
      await downloadAndInstallOfflineModel((percent) => {
        setDownloadProgress(percent);
      });

      // If no knowledge packs are currently installed, install the first available pack
      const installed = await activeService.listPacks();
      if (installed.length === 0 && packs.length > 0 && activeService.downloadPack) {
        try {
          await activeService.downloadPack(packs[0].id);
        } catch (packErr) {
          console.warn('Auto-pack install warning:', packErr);
        }
      }

      resetLocalInferenceSession();
      const updated = await getOfflineAIReadiness();
      setReadiness(updated);
      notify('On-device plant diagnosis AI pack prepared and SHA-256 verified!', 'success');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to prepare offline model.';
      setModelActionError(msg);
      notify(msg, 'error');
    } finally {
      setIsDownloadingModel(false);
    }
  }

  async function handleRemoveModel() {
    try {
      await removeOfflineModel();
      resetLocalInferenceSession();
      const updated = await getOfflineAIReadiness();
      setReadiness(updated);
      notify('Offline AI model removed from device cache.', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to remove model.', 'error');
    }
  }

  async function showPreview() {
    setState('loading');
    const result = await demoService.listPacks();
    setPacks(result);
    setIsPreview(true);
    setState('ready');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.cropCategories.some((c) => c.toLowerCase().includes(q)) ||
        (p.region?.toLowerCase().includes(q) ?? false),
    );
  }, [packs, search]);

  return (
    <div className="space-y-6">
      {/* Header with Title and Language Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
            {t.libraryTitle}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed max-w-2xl">
            {t.libraryDescription}
          </p>
        </div>
        <LanguageSelector />
      </div>

      {!isOnline && (
        <div
          data-testid="library-offline-banner"
          className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs md:text-sm text-amber-900"
        >
          <WifiOff size={18} className="text-amber-700 shrink-0" aria-hidden="true" />
          <span>
            <strong>{t.offlineMode}:</strong> {t.cachedShellOffline}
          </span>
        </div>
      )}

      {/* FEATURE 1: DEDICATED ON-DEVICE OFFLINE AI DIAGNOSIS PACK CARD */}
      <div
        data-testid="offline-ai-pack-card"
        className="rounded-2xl border border-primary/25 bg-linear-to-br from-card to-primary/5 p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
              <Cpu size={24} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                {t.offlineAiPackTitle}
                <Sparkles size={16} className="text-primary" aria-hidden="true" />
              </h2>
              <p className="text-xs text-muted-foreground">
                MobileNetV2 ONNX · WebAssembly CPU runtime · IndexedDB
              </p>
            </div>
          </div>

          <div>
            {(() => {
              const stateKey = readiness?.systemState || (
                readiness?.isPhotoDiagnosisReady
                  ? 'offline_photo_diagnosis_ready'
                  : readiness?.isModelReady
                  ? 'offline_model_ready'
                  : readiness?.isKnowledgePackReady
                  ? 'offline_knowledge_pack_ready'
                  : 'resources_missing_or_outdated'
              );
              const systemStateConfig: Record<string, { label: string; bg: string; icon: typeof CheckCircle2 }> = {
                online_atlas_ready: { label: t.stateOnlineAtlasReady, bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle2 },
                offline_photo_diagnosis_ready: { label: t.stateOfflinePhotoDiagnosisReady, bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
                offline_model_ready: { label: t.stateOfflineModelReady, bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertCircle },
                offline_knowledge_pack_ready: { label: t.stateOfflineKnowledgePackReady, bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertCircle },
                partial_offline_availability: { label: t.statePartialOfflineAvailability, bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertCircle },
                app_available_offline: { label: t.stateAppAvailableOffline, bg: 'bg-zinc-100 text-zinc-700 border-zinc-300', icon: AlertCircle },
                resources_missing_or_outdated: { label: t.stateResourcesMissingOrOutdated, bg: 'bg-zinc-100 text-zinc-700 border-zinc-300', icon: AlertCircle },
              };
              const cfg = systemStateConfig[stateKey] || systemStateConfig.resources_missing_or_outdated;
              const Icon = cfg.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg}`}>
                  <Icon size={13} aria-hidden="true" />
                  {cfg.label}
                </span>
              );
            })()}
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">
          {t.offlineAiPackDesc}
        </p>

        {/* 3-Pillar Resource Readiness Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Pillar 1: Model */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Cpu size={14} className="text-primary" />
                On-Device AI Model
              </span>
              {readiness?.isModelReady ? (
                <span className="text-emerald-700 font-medium">Ready</span>
              ) : (
                <span className="text-zinc-500">Not Installed</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              MobileNetV2 (8.8 MB) · 38 plant classes
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
              <ShieldCheck size={12} className={readiness?.isModelReady ? 'text-emerald-600' : 'text-zinc-400'} />
              <span>SHA-256: {EXPECTED_MODEL_SHA256.slice(0, 10)}…</span>
            </div>
          </div>

          {/* Pillar 2: Knowledge Packs */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Database size={14} className="text-primary" />
                Agricultural Evidence
              </span>
              <span className={readiness && readiness.installedPackCount > 0 ? 'text-emerald-700 font-medium' : 'text-zinc-500'}>
                {readiness?.installedPackCount ?? 0} pack(s)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Grounded ICAR / TNAU / USDA bulletins
            </p>
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Stored locally in IndexedDB</span>
            </div>
          </div>

          {/* Pillar 3: Offline Shell */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive size={14} className="text-primary" />
                Application Shell (PWA)
              </span>
              <span className="text-emerald-700 font-medium">Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Workbox Service Worker + Cache Storage
            </p>
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Zero-network offline reloadable</span>
            </div>
          </div>
        </div>

        {/* Progress Bar when downloading */}
        {isDownloadingModel && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-primary" />
                {downloadProgress < 100 ? 'Downloading MobileNetV2 ONNX model…' : t.offlineVerifying}
              </span>
              <span className="font-mono text-muted-foreground">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {modelActionError && (
          <div className="flex items-center gap-2 text-xs text-destructive rounded-lg bg-destructive/10 p-2.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>{modelActionError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {!readiness?.isModelReady ? (
            <button
              type="button"
              onClick={() => void handlePrepareOfflineAI()}
              disabled={isDownloadingModel || !isOnline}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isDownloadingModel ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              <span>{isDownloadingModel ? t.offlineVerifying : t.offlinePrepareBtn}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <ShieldCheck size={15} className="text-emerald-600" />
                {t.offlineModelVerified}
              </span>
              <button
                type="button"
                onClick={() => void handleRemoveModel()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>{t.offlineRemoveModelBtn}</span>
              </button>
            </div>
          )}

          {!isOnline && !readiness?.isModelReady && (
            <span className="text-xs text-amber-700">
              * Connect to the internet to download the on-device AI model.
            </span>
          )}
        </div>
      </div>

      {state === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state === 'error' && <ErrorState message={errorMsg} onRetry={() => void load()} />}

      {/* Offline screen */}
      {state === 'offline' && (
        <div className="space-y-5" data-testid="library-offline-screen">
          <OfflineServiceScreen
            title={t.libraryOfflineCatalogTitle}
            message={t.libraryOfflineCatalogDesc}
            onRetry={() => void load()}
            secondaryAction={
              <button
                type="button"
                onClick={showPreview}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <Eye size={16} aria-hidden="true" />
                {t.libraryPreviewPacksBtn}
              </button>
            }
          />
        </div>
      )}

      {/* Backend unavailable */}
      {state === 'unavailable' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-info-bg p-5 flex items-start gap-3">
            <ServerOff size={20} className="text-info mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t.libraryUnavailableTitle}</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                {t.libraryUnavailableDesc}
              </p>
              <button
                type="button"
                onClick={showPreview}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <Eye size={16} aria-hidden="true" />
                {t.libraryPreviewPacksBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Genuinely empty library */}
      {state === 'empty' && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Inbox size={40} className="text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-foreground mb-1">{t.libraryEmptyTitle}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t.libraryEmptyDesc}
          </p>
        </div>
      )}

      {/* Packs available */}
      {state === 'ready' && (
        <div className="space-y-5">
          {isPreview && (
            <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{t.illustrativePackWarning}</p>
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.librarySearchPlaceholder}
              aria-label={t.libraryFilterAria}
              className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t.noPacksMatching}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((pack) => (
                <Link
                  key={pack.id}
                  to={`/library/${pack.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer"
                >
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                    <BookOpen size={24} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-heading text-base font-semibold text-card-foreground">{pack.name}</h2>
                      {pack.status === 'downloaded' && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                          {t.packInstalled}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{pack.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {pack.region && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} aria-hidden="true" />
                          {pack.region}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <HardDrive size={12} aria-hidden="true" />
                        {formatBytes(pack.sizeBytes)}
                      </span>
                      <span>{pack.sourceCount} {t.packSourcesCount}</span>
                      <span>v{pack.version}</span>
                    </div>
                  </div>
                  <ArrowRight size={20} className="hidden sm:block text-muted-foreground group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
