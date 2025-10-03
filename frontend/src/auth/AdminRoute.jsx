import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function AdminRoute({ children }) {
  const { isAuthed, isAdmin } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
