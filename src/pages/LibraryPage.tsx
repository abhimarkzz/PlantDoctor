import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HardDrive, MapPin, ArrowRight, ServerOff, Eye, Search, Inbox } from 'lucide-react';
import { activeService, demoService } from '../services';
import { BackendUnavailableError } from '../api/client';
import type { KnowledgePack } from '../models/types';
import { CardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

type LibraryState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryPage() {
  const [state, setState] = useState<LibraryState>('loading');
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setState('loading');
    setIsPreview(false);
    try {
      const result = await activeService.listPacks();
      setPacks(result);
      setState(result.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setState('unavailable');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Could not load the library.');
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
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          Offline Library
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Knowledge packs will bundle evidence for offline agricultural reference. Once a pack is
          downloaded and stored on your device, you can consult it without connectivity.
        </p>
      </div>

      {state === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state === 'error' && <ErrorState message={errorMsg} onRetry={() => void load()} />}

      {/* Backend unavailable — distinct from an empty library */}
      {state === 'unavailable' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-info-bg p-5 flex items-start gap-3">
            <ServerOff size={20} className="text-info mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Library unavailable — backend not connected</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                We can't list knowledge packs because the backend isn't connected. This is different
                from an empty library: there may be packs available once the service is reachable.
                Downloading and offline search require MongoDB Atlas storage and a local evidence
                store (IndexedDB), planned for a future milestone.
              </p>
              <button
                type="button"
                onClick={showPreview}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <Eye size={16} aria-hidden="true" />
                Preview illustrative packs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Genuinely empty library */}
      {state === 'empty' && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Inbox size={40} className="text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold text-foreground mb-1">No packs installed</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your offline library is empty. When packs become available, you'll be able to download them here.
          </p>
        </div>
      )}

      {/* Packs available (real or previewed) */}
      {state === 'ready' && (
        <div className="space-y-5">
          {isPreview && (
            <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Illustrative preview — these packs are placeholders.</p>
              <p className="mt-1">They cannot be downloaded and do not represent real installed data.</p>
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by crop, region, or name…"
              aria-label="Filter packs"
              className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No packs match "{search}".
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
                    <h2 className="font-heading text-base font-semibold text-card-foreground mb-1">{pack.name}</h2>
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
                      <span>{pack.sourceCount} sources</span>
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
