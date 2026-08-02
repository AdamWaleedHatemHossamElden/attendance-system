import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { initializing, isAuthed } = useAuth();
  if (initializing) return <div className="card">Loading...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}
