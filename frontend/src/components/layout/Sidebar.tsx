import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../ui';

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  adminOnly?: boolean;
  icon: keyof typeof icons;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', end: true, adminOnly: true, icon: 'home' },
  { label: 'Admins', to: '/admins', adminOnly: true, icon: 'shield' },
  { label: 'Students', to: '/students', icon: 'users' },
  { label: 'Sessions', to: '/sessions', icon: 'calendar' },
  { label: 'Attendance', to: '/attendance', icon: 'check' },
  { label: 'Reports', to: '/reports', adminOnly: true, icon: 'chart' },
  { label: 'Birthdays', to: '/birthdays', icon: 'cake' },
];

export function Sidebar() {
  const { initializing, isAdmin, user, logout } = useAuth();
  const visibleItems = navItems.filter((item) => !item.adminOnly || (!initializing && isAdmin));

  return (
    <aside className="v2-sidebar" aria-label="Primary navigation">
      <div className="v2-sidebar__brand">
        <div className="v2-sidebar__name">Attendance System</div>
        <div className="v2-sidebar__sub">V2 workspace</div>
      </div>

      <div className="v2-sidebar__section">Navigation</div>
      <nav className="v2-sidebar__nav">
        {visibleItems.map((item) => {
          const Icon = icons[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `v2-sidebar__link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="v2-sidebar__account">
        <div className="v2-sidebar__user">
          <div className="v2-sidebar__user-name">{initializing ? 'Checking session' : user?.name || 'User'}</div>
          <div className="v2-sidebar__user-role">{initializing ? 'loading' : user?.role || 'user'}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={logout}>
          Logout
        </Button>
      </div>
    </aside>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg className="v2-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  home: () => <Svg><path d="M3 9.5 12 3l9 6.5v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>,
  users: () => <Svg><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  calendar: () => <Svg><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>,
  check: () => <Svg><path d="M20 7 10 17l-6-6" /></Svg>,
  cake: () => <Svg><path d="M12 3v3" /><path d="M8 7h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4Z" /><path d="M2 21h20v-5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v5Z" /></Svg>,
  shield: () => <Svg><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" /></Svg>,
  chart: () => <Svg><path d="M3 3v18h18" /><rect x="7" y="8" width="3" height="8" rx="1" /><rect x="12" y="5" width="3" height="11" rx="1" /><rect x="17" y="11" width="3" height="5" rx="1" /></Svg>,
};
