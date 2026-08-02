import { Routes, Route, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import Sessions from './pages/Sessions.jsx'
import Attendance from './pages/Attendance.jsx'
import Birthdays from './pages/Birthdays.jsx'
import ToastProvider from './ui/ToastProvider.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Reports from './pages/Reports.jsx'        // NEW

// Auth
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import AdminRoute from './auth/AdminRoute'
import Login from './pages/Login.jsx'
import { AppShell } from './components/layout'

// Admins page
import Admins from './pages/Admins.jsx'

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
  const routes = (
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
  )

  if (hideSidebar) return <main className="auth-main">{routes}</main>
  return <AppShell>{routes}</AppShell>
}
