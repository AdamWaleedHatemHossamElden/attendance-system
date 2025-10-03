import { useEffect, useRef } from "react";

export default function NoteModal({ open, student, initialNote = "", onSave, onClose }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        // close only when clicking backdrop (not the note)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-[520px] max-w-[92vw] p-0 shadow-2xl"
        style={{
          background: "linear-gradient(#fff5b3,#ffe97a)",
          border: "1px solid #e2c84a",
          borderRadius: "8px",
          transform: "rotate(-1.2deg)",
        }}
      >
        {/* push pin */}
        <div
          className="absolute -top-3 left-7 w-4 h-4 rounded-full"
          style={{ background: "#e11d48", boxShadow: "0 2px 0 rgba(0,0,0,.25)" }}
          aria-hidden
        />
        {/* curl effect */}
        <div
          className="absolute -bottom-1 right-8 w-16 h-6"
          style={{
            background: "linear-gradient( to top right, rgba(0,0,0,.25), rgba(0,0,0,0) )",
            clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          }}
          aria-hidden
        />

        <div className="p-5">
          <div className="mb-2 font-semibold text-gray-700">
            Note — {student?.name} {student?.father_name ? student.father_name + " " : ""}{student?.last_name || ""}
          </div>
          <textarea
            ref={textareaRef}
            defaultValue={initialNote}
            rows={8}
            className="w-full rounded-md border border-yellow-300/60 bg-transparent p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Type behavior, reminders, guardians, medical notes, etc."
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                onSave(e.currentTarget.value);
              }
            }}
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">Tip: Press <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> to save</div>
            <div className="space-x-2">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button
                className="btn primary"
                onClick={() => onSave(textareaRef.current?.value ?? "")}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
