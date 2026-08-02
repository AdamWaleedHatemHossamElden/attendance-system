import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  text?: string;
  actions?: ReactNode;
}

export function EmptyState({
  title = 'No data',
  text = 'There is nothing to show yet.',
  actions,
}: EmptyStateProps) {
  return (
    <div className="v2-state">
      <div>
        <p className="v2-state__title">{title}</p>
        <p className="v2-state__text">{text}</p>
        {actions ? <div style={{ marginTop: 16 }}>{actions}</div> : null}
      </div>
    </div>
  );
}
