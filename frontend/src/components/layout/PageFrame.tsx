import type { ReactNode } from 'react';

interface PageFrameProps {
  children: ReactNode;
}

export function PageFrame({ children }: PageFrameProps) {
  return <div className="v2-page-frame">{children}</div>;
}
