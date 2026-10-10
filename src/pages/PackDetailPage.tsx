import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, HardDrive, MapPin, Calendar, Download, Info, Tag } from 'lucide-react';
import { DEMO_PACKS } from '../demo/fixtures';
import { EmptyState } from '../components/EmptyState';
import { IllustrativeBanner } from '../components/IllustrativeBanner';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pack = DEMO_PACKS.find((p) => p.id === id);

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

  return (
    <div className="space-y-6">
      <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Library
      </Link>

      <IllustrativeBanner />

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{pack.name}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{pack.description}</p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Tag, label: 'Version', value: pack.version },
          { icon: HardDrive, label: 'Size', value: formatBytes(pack.sizeBytes) },
          { icon: MapPin, label: 'Region', value: pack.region ?? 'Global' },
          { icon: Calendar, label: 'Updated', value: new Date(pack.lastUpdated).toLocaleDateString() },
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

      {/* Download button — disabled with explanation */}
      <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-xl bg-muted px-6 py-3 text-sm font-medium text-muted-foreground cursor-not-allowed"
          aria-disabled="true"
        >
          <Download size={18} aria-hidden="true" />
          Download for offline use
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Not available in this milestone. Offline pack storage requires MongoDB Atlas and a local IndexedDB evidence store.
        </p>
      </div>
    </div>
  );
}
