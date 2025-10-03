import { useEffect, useState } from 'react';
import { getAdmins, createAdmin, deleteAdmin } from '../api';
import { useAuth } from '../auth/AuthProvider';
import '../styles/admins.css'; // layout + panel/badge styles

export default function Admins() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // delete-confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const isOnlyOneAdmin = list.length <= 1;

  async function load() {
    setErr('');
    try {
      const { data } = await getAdmins();
      setList(data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load admins');
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await createAdmin(form);
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to create admin');
    } finally {
      setBusy(false);
    }
  }

  function askDelete(a) {
    setTarget(a);
    setConfirmOpen(true);
  }

  async function doDelete() {
    if (!target) return;
    setBusy(true);
    setErr('');
    try {
      await deleteAdmin(target.id);
      setConfirmOpen(false);
      setTarget(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to delete admin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section admins-page">
      <h2 className="h2">Admins</h2>

      {err && <div className="alert error" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="admins-grid">
        {/* Create Admin panel */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M16 11h6" />
                <path d="M19 8v6" />
              </svg>
            </div>

            <h3 className="panel__title">Create New Admin</h3>
            <form onSubmit={onCreate} className="admins-form">
              <div>
                <label htmlFor="adm-name">Name</label>
                <input
                  id="adm-name"
                  className="input"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="adm-email">Email</label>
                <input
                  id="adm-email"
                  className="input"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="adm-pass">Password</label>
                <input
                  id="adm-pass"
                  className="input"
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create Admin'}
              </button>
            </form>
          </div>
        </div>

        {/* Admin list panel */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

            <div className="rep-head">
              <h3 className="panel__title">Admin List</h3>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>ID</th>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'left' }}>Email</th>
                    <th style={{ textAlign: 'left' }}>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(a => {
                    const isSelf = user?.id === a.id || user?.email === a.email;
                    return (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td>{a.name}</td>
                        <td>{a.email}</td>
                        <td>{a.role}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn danger"
                            onClick={() => askDelete(a)}
                            disabled={busy || isSelf || isOnlyOneAdmin}
                            title={
                              isSelf ? 'You cannot delete your own account'
                              : isOnlyOneAdmin ? 'At least one admin must remain'
                              : 'Delete admin'
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 12 }}>
                        No admins yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <Confirm
          title="Delete admin?"
          message={`Are you sure you want to delete "${target?.name}" (${target?.email})? This cannot be undone.`}
          onCancel={() => { setConfirmOpen(false); setTarget(null); }}
          onConfirm={doDelete}
        />
      )}
    </section>
  );
}

/* Lightweight inline confirm */
function Confirm({ title, message, onCancel, onConfirm }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.25)',
      display:'grid', placeItems:'center', zIndex:60
    }}>
      <div style={{
        background:'#fff', border:'1px solid #e6e6ee', borderRadius:12,
        width:420, maxWidth:'95vw', padding:16, boxShadow:'0 10px 30px rgba(0,0,0,0.15)'
      }}>
        <div style={{fontWeight:700, marginBottom:8}}>{title}</div>
        <div style={{color:'#667085', marginBottom:16}}>{message}</div>
        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
