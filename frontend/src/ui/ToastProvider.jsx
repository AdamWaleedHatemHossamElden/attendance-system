import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type='info', ttl=3500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{
        position:'fixed', right:16, bottom:16, display:'grid', gap:10, zIndex:50
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            minWidth:260, padding:'12px 14px', borderRadius:12,
            background: t.type==='error' ? '#fee2e2' : t.type==='success' ? '#dcfce7' : '#eef2ff',
            color:'#111', border:'1px solid rgba(0,0,0,0.05)', boxShadow:'0 2px 10px rgba(0,0,0,0.08)'
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}