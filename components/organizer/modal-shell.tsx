"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function ModalShell({
  title,
  saving,
  error,
  onClose,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind the sheet from scrolling (and shifting the
    // fixed sheet) while it's open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [saving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overscroll-contain" onClick={() => !saving && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md max-h-[90dvh] flex flex-col bg-card border border-border rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-bold font-(family-name:--font-display)">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 space-y-4 overflow-y-auto overscroll-contain min-h-0 flex-1">
          {children}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5">{error}</div>}
        </div>
        <div className="flex gap-2 sm:justify-end px-4 sm:px-5 py-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2.5 sm:py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2.5 sm:py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
