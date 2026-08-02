import type { ReactNode } from 'react';
import { PageFrame } from './PageFrame';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="v2-shell">
      <div className="v2-shell__sidebar">
        <Sidebar />
      </div>
      <div className="v2-shell__body">
        <Topbar />
        <main className="v2-shell__main">
          <PageFrame>{children}</PageFrame>
        </main>
      </div>
    </div>
  );
}
