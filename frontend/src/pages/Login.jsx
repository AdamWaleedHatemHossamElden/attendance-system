import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthProvider';

// MOVED styles
import '../styles/login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const { login } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login({ token: data.token, user: data.user });
      nav('/', { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card__frame">
          <div className="auth-avatar">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="#e2e8f0"/>
              <path d="M4 20a8 8 0 0 1 16 0" fill="#e2e8f0"/>
            </svg>
          </div>
          <div className="auth-title">Admin Sign In</div>
          <p className="auth-sub">Enter your login credentials</p>

          {err && <div className="auth-alert">{err}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="admin@school.edu"
              autoComplete="username"
            />

            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              required
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-foot">
            <span className="auth-brand">Attendance Dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
