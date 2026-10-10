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
} from 'lucide-react';
import { demoService } from '../services';
import type { KnowledgePack } from '../models/types';
import { EmptyState } from '../components/EmptyState';
import { IllustrativeBanner } from '../components/IllustrativeBanner';
import { CardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

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
  const [pack, setPack] = useState<KnowledgePack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Pack details only exist as illustrative previews in this milestone.
    demoService
      .getPack(id ?? '')
      .then((p) => active && setPack(p))
      .catch(() => active && setPack(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

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
        title="Pack not found"
        description="This knowledge pack does not exist or could not be loaded."
        action={
          <Link to="/library" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark cursor-pointer">
            Back to Library
          </Link>
        }
      />
    );
  }

  const statusLabel: Record<KnowledgePack['status'], string> = {
    available: 'Available (not downloaded)',
    downloading: 'Downloading…',
    downloaded: 'Downloaded',
    update_available: 'Update available',
  };

  return (
    <div className="space-y-6">
      <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Library
      </Link>

      <IllustrativeBanner />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">{pack.name}</h1>
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
          { icon: Tag, label: 'Version', value: pack.version },
          { icon: HardDrive, label: 'Size', value: formatBytes(pack.sizeBytes) },
          { icon: MapPin, label: 'Region', value: pack.region ?? 'Global' },
          { icon: Download, label: 'Download status', value: statusLabel[pack.status] },
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
          { icon: Calendar, label: 'Source last updated', value: formatTime(pack.lastUpdated) },
          { icon: RefreshCw, label: 'Last synchronized (this device)', value: formatTime(pack.lastSynced) },
          { icon: ShieldCheck, label: 'Sources last verified', value: formatTime(pack.lastVerified) },
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
        <h2 className="font-heading text-base font-semibold text-foreground mb-3">Crop categories</h2>
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
          This pack references <strong className="text-foreground">{pack.sourceCount} sources</strong>.
          Source provenance and verification metadata will be available after the backend is connected.
        </p>
      </div>

      {/* Download — disabled with explanation; shows no fake success */}
      <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
        <button
          type="button"
          onClick={() => notify('Downloads are not available in this milestone — no pack was installed.', 'info')}
          className="inline-flex items-center gap-2 rounded-xl bg-muted px-6 py-3 text-sm font-medium text-muted-foreground cursor-pointer"
        >
          <Download size={18} aria-hidden="true" />
          Download for offline use
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Not available in this milestone. Offline pack storage requires MongoDB Atlas and a local IndexedDB evidence store.
          No download or persistence occurs, and no success will be reported.
        </p>
      </div>

      {/* Known offline limitations */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground mb-2">Known offline limitations</h2>
        <ul className="text-sm text-foreground/80 space-y-1.5">
          <li className="flex gap-2"><span className="text-amber-600">•</span>Offline evidence can only be as current as the last successful synchronization.</li>
          <li className="flex gap-2"><span className="text-amber-600">•</span>Cloud retrieval and generation require connectivity and are unavailable offline.</li>
          <li className="flex gap-2"><span className="text-amber-600">•</span>A cached app shell does not enable offline question answering on its own.</li>
        </ul>
      </div>
    </div>
  );
}
