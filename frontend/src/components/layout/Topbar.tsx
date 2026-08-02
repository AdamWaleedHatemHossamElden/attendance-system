import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Badge } from '../ui';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/admins': 'Admins',
  '/students': 'Students',
  '/sessions': 'Sessions',
  '/attendance': 'Attendance',
  '/reports': 'Reports',
  '/birthdays': 'Birthdays',
};

export function Topbar() {
  const location = useLocation();
  const { user } = useAuth();
  const title = pageTitles[location.pathname] || (location.pathname.startsWith('/students/') ? 'Student Profile' : 'Attendance System');

  return (
    <header className="v2-topbar">
      <div>
        <h1 className="v2-topbar__title">{title}</h1>
        <div className="v2-topbar__meta">Manage attendance, students, and sessions</div>
      </div>
      <div className="v2-topbar__actions">
        <Badge>{user?.role || 'user'}</Badge>
      </div>
    </header>
  );
}
