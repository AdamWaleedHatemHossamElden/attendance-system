import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Badge, Button, Card, Input } from '../components/ui';
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
    <main className="login-v2">
      <section className="login-v2__brand" aria-label="Attendance System V2">
        <div className="login-v2__mark" aria-hidden="true">AS</div>
        <Badge>Attendance System V2</Badge>
        <div>
          <h1>Attendance that feels organized from the first click.</h1>
          <p>
            Sign in to manage students, sessions, reports, and attendance records
            from one focused workspace.
          </p>
        </div>
        <div className="login-v2__features" aria-label="System highlights">
          <span>Fresh session validation</span>
          <span>Admin controls</span>
          <span>Student records</span>
        </div>
      </section>

      <Card className="login-v2__card">
        <div className="login-v2__card-head">
          <div className="login-v2__mini-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 7h8M8 12h8M8 17h5" />
              <rect x="4" y="3" width="16" height="18" rx="3" />
            </svg>
          </div>
          <div>
            <h2>Sign in</h2>
            <p>Use your Attendance System account credentials.</p>
          </div>
        </div>

        {err ? (
          <div className="login-v2__alert" role="alert">
            {err}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="login-v2__form">
          <div className="login-v2__field">
            <label htmlFor="email">Email address</label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="username"
              disabled={busy}
            />
          </div>

          <div className="login-v2__field">
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={busy}
            />
          </div>

          <Button className="login-v2__submit" type="submit" variant="primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="login-v2__note">
          Access is protected by your backend account and current role.
        </div>
      </Card>
    </main>
  );
}
