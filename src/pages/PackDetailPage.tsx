import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HardDrive,
  MapPin,
  Calendar,
  Download,
  Info,
  Tag,
  RefreshCw,
  ShieldCheck,
  Hash,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { activeService, demoService } from '../services';
import type { KnowledgePack } from '../models/types';
import { EmptyState } from '../components/EmptyState';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { CardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : 'Never';
}

export function PackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useToast();
  const { t } = useTranslation();
  const [pack, setPack] = useState<KnowledgePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  async function loadPack() {
    if (!id) return;
    setLoading(true);
    try {
      const p = await activeService.getPack(id);
      setPack(p);
      setIsDemo(false);
    } catch {
      try {
        const demoP = await demoService.getPack(id);
        setPack(demoP);
        setIsDemo(true);
      } catch {
        setPack(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPack();
  }, [id]);

  async function handleDownload() {
    if (!pack || !activeService.downloadPack) return;
    setIsDownloading(true);
    try {
      await activeService.downloadPack(pack.id);
      notify(`Downloaded and saved '${pack.name}' to local IndexedDB.`, 'success');
      await loadPack();
    } catch (err) {
      notify(err instanceof Error ? err.message : t.errorGeneric, 'error');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleRemove() {
    if (!pack || !activeService.removePack) return;
    setIsRemoving(true);
    try {
      await activeService.removePack(pack.id);
      notify(`Removed '${pack.name}' from device storage.`, 'info');
      await loadPack();
    } catch (err) {
      notify(err instanceof Error ? err.message : t.errorGeneric, 'error');
    } finally {
      setIsRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!pack) {
    return (
      <EmptyState
        icon={<Info size={48} />}
        title={t.packNotFoundTitle}
        description={t.packNotFoundDesc}
        action={
          <Link to="/library" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark cursor-pointer">
            {t.backToLibrary}
          </Link>
        }
      />
    );
  }

  const isDownloaded = pack.status === 'downloaded';

  const statusLabel: Record<KnowledgePack['status'], string> = {
    available: t.packStatusAvailable,
    downloading: t.packDownloading,
    downloaded: t.packInstalled,
    update_available: t.packStatusUpdateAvailable,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft size={16} aria-hidden="true" />
          {t.backToLibrary}
        </Link>
        <LanguageSelector variant="compact" />
      </div>

      {isDemo && <IllustrativeBanner />}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">{pack.name}</h1>
          {isDownloaded && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5">
              <CheckCircle2 size={12} aria-hidden="true" />
              {t.packInstalled}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{pack.description}</p>
        <p className="text-xs text-muted-foreground font-mono mt-2 inline-flex items-center gap-1">
          <Hash size={12} aria-hidden="true" />
          {pack.id}
        </p>
      </div>

      {/* Identity & status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Tag, label: t.packVersion, value: `v${pack.version}` },
          { icon: HardDrive, label: t.packSize, value: formatBytes(pack.sizeBytes) },
          { icon: MapPin, label: t.regionLabel, value: pack.region ?? 'Global' },
          { icon: Download, label: t.packStorageStatus, value: statusLabel[pack.status] },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon size={14} aria-hidden="true" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="text-sm font-semibold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Sync & verification */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Calendar, label: t.packLastUpdated, value: formatTime(pack.lastUpdated) },
          { icon: RefreshCw, label: t.packLastSynced, value: formatTime(pack.lastSynced) },
          { icon: ShieldCheck, label: t.packLastVerified, value: formatTime(pack.lastVerified) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon size={14} aria-hidden="true" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="text-sm font-semibold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Crop categories */}
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground mb-3">{t.cropLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {pack.cropCategories.map((cat) => (
            <span key={cat} className="inline-block rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Source count */}
      <div className="rounded-xl bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {t.packBundlesNote} ({pack.sourceCount} {t.packSourcesCount}).
        </p>
      </div>

      {/* Real Download / Delete Action Card */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        {isDownloaded ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 text-sm font-medium">
              <CheckCircle2 size={18} aria-hidden="true" />
              {t.packStoredOfflineNotice}
            </div>
            <div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 px-5 py-2.5 text-sm font-medium hover:bg-destructive/20 cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {t.packRemoveBtn}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.packRemoveStorageNote}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || isDemo}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-on-primary hover:bg-primary-dark cursor-pointer disabled:opacity-50 shadow-sm transition-all"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  {t.packDownloading}
                </>
              ) : (
                <>
                  <Download size={18} aria-hidden="true" />
                  {t.downloadForOfflineUse}
                </>
              )}
            </button>
            {isDemo ? (
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t.packDownloadDemoNote}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t.packDownloadDesc}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Known offline limitations with High Contrast Warning */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-950 dark:text-amber-100">
        <h2 className="font-heading text-base font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
          {t.packKnownLimitations}
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-200 space-y-1.5">
          <li className="flex gap-2"><span className="text-amber-700 dark:text-amber-400 font-bold">•</span>{t.packLimitSync} ({formatTime(pack.lastSynced)}).</li>
          <li className="flex gap-2"><span className="text-amber-700 dark:text-amber-400 font-bold">•</span>{t.packLimitVectors}</li>
          <li className="flex gap-2"><span className="text-amber-700 dark:text-amber-400 font-bold">•</span>{t.packLimitRegulations}</li>
        </ul>
      </div>
    </div>
  );
}
