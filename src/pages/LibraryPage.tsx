import { Link } from 'react-router-dom';
import { BookOpen, HardDrive, MapPin, ArrowRight, WifiOff } from 'lucide-react';
import { DEMO_PACKS } from '../demo/fixtures';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          Offline Library
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Knowledge packs contain pre-packaged evidence for offline agricultural reference.
          Download a pack to access guidance without an internet connection.
        </p>
      </div>

      {/* Honest status box */}
      <div className="rounded-2xl border border-border bg-info-bg p-5 flex items-start gap-3">
        <WifiOff size={20} className="text-info mt-0.5 shrink-0" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Offline pack downloads are not yet available</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            The knowledge packs shown below are illustrative placeholders. Downloading and
            offline search require a backend with MongoDB Atlas storage and a local evidence store
            (IndexedDB), which is planned for a future milestone.
          </p>
        </div>
      </div>

      {/* Pack list */}
      <div className="space-y-4">
        {DEMO_PACKS.map((pack) => (
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

            <ArrowRight
              size={20}
              className="hidden sm:block text-muted-foreground group-hover:text-primary transition-colors shrink-0"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
