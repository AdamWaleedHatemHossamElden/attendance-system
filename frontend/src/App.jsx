import { NavLink, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import Sessions from './pages/Sessions.jsx'
import Attendance from './pages/Attendance.jsx'
import Birthdays from './pages/Birthdays.jsx'
import ToastProvider from './ui/ToastProvider.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Reports from './pages/Reports.jsx'        // NEW

// Auth
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import AdminRoute from './auth/AdminRoute.jsx'
import Login from './pages/Login.jsx'

// Admins page
import Admins from './pages/Admins.jsx'

// Sidebar styles
import './styles/sidebar.css'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </AuthProvider>
  )
}

function Layout() {
  const location = useLocation()
  const hideSidebar = location.pathname === '/login'

  return (
    <div
      className={`app-grid ${!hideSidebar ? 'with-sidebar' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: hideSidebar ? '1fr' : '240px 1fr',
        minHeight: '100vh',
        background: hideSidebar ? 'transparent' : '#fafafc'
      }}
    >
      {!hideSidebar && <AsideNav />}

      <main
        className={hideSidebar ? 'auth-main' : 'container'}
        style={hideSidebar ? { padding: 0 } : { padding: '20px' }}
      >
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Admin-only */}
          <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admins" element={<AdminRoute><Admins /></AdminRoute>} />
          <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} /> {/* NEW */}

          {/* Protected (any logged-in user) */}
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

/* ---------- inline icons for sidebar ---------- */
const I = {
  Home:    (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M3 9.5 12 3l9 6.5v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>),
  Users:   (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  Calendar:(props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  Check:   (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M20 7 10 17l-6-6"/></svg>),
  Cake:    (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M12 3v3"/><path d="M8 7h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4Z"/><path d="M2 21h20v-5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v5Z"/></svg>),
  Shield:  (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/></svg>),
  Chart:   (props) => (<svg className="s-ico" viewBox="0 0 24 24" {...props}><path d="M3 3v18h18"/><rect x="7" y="8" width="3" height="8" rx="1"/><rect x="12" y="5" width="3" height="11" rx="1"/><rect x="17" y="11" width="3" height="5" rx="1"/></svg>),
};

function AsideNav() {
  const { isAuthed, isAdmin, user, logout } = useAuth();

  return (
    <aside className="s-aside">
      <div className="s-brand">Attendance Dashboard</div>

      <div className="s-section">Navigation</div>
      <nav className="s-nav">
        {isAuthed ? (
          <>
            <NavLink to="/" end className={({isActive})=>nl(isActive)}><I.Home/> Dashboard</NavLink>
            {isAdmin && <NavLink to="/admins" className={({isActive})=>nl(isActive)}><I.Shield/> Admins</NavLink>}
            <NavLink to="/students" className={({isActive})=>nl(isActive)}><I.Users/> Students</NavLink>
            <NavLink to="/sessions" className={({isActive})=>nl(isActive)}><I.Calendar/> Sessions</NavLink>
            <NavLink to="/attendance" className={({isActive})=>nl(isActive)}><I.Check/> Attendance</NavLink>
            <NavLink to="/reports" className={({isActive})=>nl(isActive)}><I.Chart/> Reports</NavLink> {/* NEW */}
            <NavLink to="/birthdays" className={({isActive})=>nl(isActive)}><I.Cake/> Birthdays</NavLink>
          </>
        ) : (
          <div style={{fontSize:14}}>
            <Link to="/login" className="s-navlink"><I.Shield/> Login</Link>
          </div>
        )}
      </nav>

      {isAuthed && (
        <div className="s-account">
          <div className="s-account__name">{user?.name || 'User'}</div>
          <div className="s-account__role">{user?.role}</div>
          <button className="s-logout" onClick={logout}>Logout</button>
        </div>
      )}

      <div style={{flex:1}} />
    </aside>
  );
}

function nl(active){ return `s-navlink ${active ? 'active' : ''}` }
