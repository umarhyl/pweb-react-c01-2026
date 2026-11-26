import { RotateCcw, Trash2, X } from "lucide-react";
import type { Application } from "../types";

interface UndoToastProps {
  deletedApplication: Application | null;
  secondsRemaining: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({
  deletedApplication,
  secondsRemaining,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  if (!deletedApplication) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-14 right-4 z-50 max-w-md xp-window shadow-xl"
    >
      <div className="xp-titlebar">
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Lamaran Dihapus
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi undo"
          className="xp-win-ctrl xp-win-ctrl-close"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      <div className="p-3 bg-xp-paper flex items-center justify-between gap-3">
        <p className="text-xs text-xp-ink leading-snug">
          Lamaran <strong>{deletedApplication.company}</strong> (
          {deletedApplication.role}) telah dihapus.
        </p>

        <button
          type="button"
          onClick={onUndo}
          className="xp-btn xp-btn-green shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Undo ({secondsRemaining}d)
        </button>
      </div>
    </div>
  );
}
