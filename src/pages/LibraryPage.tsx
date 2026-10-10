import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HardDrive, MapPin, ArrowRight, ServerOff, Eye, Search, Inbox, WifiOff } from 'lucide-react';
import { activeService, demoService } from '../services';
import { BackendUnavailableError, DeviceOfflineError } from '../api/client';
import type { KnowledgePack } from '../models/types';
import { CardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { OfflineServiceScreen } from '../components/OfflineServiceScreen';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

type LibraryState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'offline' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryPage() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const [state, setState] = useState<LibraryState>('loading');
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
