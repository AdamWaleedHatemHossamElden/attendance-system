import { useEffect } from 'react';

export default function Confirm({ open, title='Confirm', message, onCancel, onConfirm }) {
  useEffect(() => {
    function onKey(e){ if (!open) return; if (e.key==='Escape') onCancel(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.25)',
      display:'grid', placeItems:'center', zIndex:60
    }}>
      <div style={{ background:'#fff', border:'1px solid #e6e6ee', borderRadius:14, width:420, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,0.15)'}}>
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