import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import type { LoginResponse } from '../api/types';
import type { User } from '../types/domain';
import {
  getJsonStorageItem,
  getStorageItem,
  removeStorageItem,
  setJsonStorageItem,
  setStorageItem,
} from '../lib/storage';
import { subscribeUnauthorized } from './events';

interface AuthContextValue {
  token: string;
  user: User | null;
  initializing: boolean;
  isAuthed: boolean;
  isAdmin: boolean;
  login: (payload: LoginResponse) => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

function clearStoredAuth(): void {
  removeStorageItem('token');
  removeStorageItem('user');
}

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === 'number' &&
    Number.isInteger(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.role === 'admin' || candidate.role === 'user')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [token, setToken] = useState(() => getStorageItem('token') || '');
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = getJsonStorageItem<User>('user');
    return isStoredUser(storedUser) ? storedUser : null;
  });
  const [initializing, setInitializing] = useState(true);

  // persist whenever token/user changes
  useEffect(() => {
    if (token) setStorageItem('token', token);
    else removeStorageItem('token');
  }, [token]);

  useEffect(() => {
    if (user) setJsonStorageItem('user', user);
    else removeStorageItem('user');
  }, [user]);

  useEffect(() => {
    let ignore = false;

    async function validateStoredSession() {
      const storedToken = getStorageItem('token');
      const storedUserRaw = getStorageItem('user');
      const storedUser = getJsonStorageItem<User>('user');

      if (storedUserRaw && !isStoredUser(storedUser)) {
        removeStorageItem('user');
        if (!ignore) setUser(null);
      }

      if (!storedToken) {
        if (!ignore) {
          clearStoredAuth();
          setToken('');
          setUser(null);
          setInitializing(false);
        }
        return;
      }

      try {
        const data = await getCurrentUser();
        if (!ignore) {
          setToken(storedToken);
          setUser(data.user);
        }
      } catch {
        if (!ignore) {
          clearStoredAuth();
          setToken('');
          setUser(null);
        }
      } finally {
        if (!ignore) setInitializing(false);
      }
    }

    validateStoredSession();

    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(({ token: t, user: u }: LoginResponse) => {
    setToken(t);
    setUser(u);
    setInitializing(false);
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    clearStoredAuth();
    nav('/login', { replace: true });
  }, [nav]);

  useEffect(() => {
    return subscribeUnauthorized(() => {
      setToken('');
      setUser(null);
      clearStoredAuth();
      setInitializing(false);
    });
  }, []);

  const value = useMemo(() => ({
    token, user,
    initializing,
    isAuthed: !initializing && !!token && !!user,
    isAdmin: !!user && user.role === 'admin',
    login, logout
  }), [token, user, initializing, login, logout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthCtx);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
export default AuthProvider;
