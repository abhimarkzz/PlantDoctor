interface Props {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: Props) {
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-muted animate-pulse mb-2 last:mb-0"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton lines={1} className="mb-4 w-3/4" />
      <Skeleton lines={3} className="mb-4" />
      <Skeleton lines={1} className="w-1/2" />
    </div>
  );
}
