import { useEffect } from "react";

export default function SideSheet({ open, title, children, footer, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && open) onClose?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`sheet ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-head">
          <h3 id="sheet-title">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </aside>
    </div>
  );
}
