import { X } from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
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
      className="fixed bottom-16 right-5 z-50 max-w-md xp-window"
    >
      <div className="xp-titlebar">
        <span className="inline-flex items-center gap-2 text-xs">
          <img
            src={RETRO_ICONS.undo}
            alt=""
            width={14}
            height={14}
            className="xp-pixel"
          />
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

      <div className="p-3.5 bg-xp-paper flex items-center justify-between gap-4">
        <p className="text-xs text-xp-ink leading-snug">
          Lamaran <strong>{deletedApplication.company}</strong> (
          {deletedApplication.role}) telah dihapus.
        </p>

        <button
          type="button"
          onClick={onUndo}
          className="xp-btn xp-btn-green shrink-0"
        >
          <img
            src={RETRO_ICONS.undo}
            alt=""
            width={14}
            height={14}
            className="xp-pixel"
          />
          Undo ({secondsRemaining}d)
        </button>
      </div>
    </div>
  );
}
