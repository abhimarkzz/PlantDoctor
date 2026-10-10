import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h2 className="font-heading text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
