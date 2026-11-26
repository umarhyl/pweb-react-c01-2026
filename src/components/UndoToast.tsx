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
      className="fixed bottom-5 right-5 z-50 max-w-md craft-modal"
    >
      <div className="craft-modal-header py-2 px-3.5">
        <span className="inline-flex items-center gap-2 font-os text-xs text-white">
          <img
            src={RETRO_ICONS.undo}
            alt=""
            width={14}
            height={14}
            className="pixel-art brightness-200"
          />
          Lamaran Dihapus
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi undo"
          className="craft-win-dot cursor-pointer hover:bg-danger hover:border-danger hover:text-white"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      <div className="p-3.5 bg-paper flex items-center justify-between gap-4">
        <p className="text-xs text-ink leading-snug">
          Lamaran <strong>{deletedApplication.company}</strong> (
          {deletedApplication.role}) telah dihapus.
        </p>

        <button
          type="button"
          onClick={onUndo}
          className="craft-btn craft-btn-primary shrink-0 py-1.5 px-3.5"
        >
          <img
            src={RETRO_ICONS.undo}
            alt=""
            width={13}
            height={13}
            className="pixel-art brightness-200"
          />
          Undo ({secondsRemaining}d)
        </button>
      </div>
    </div>
  );
}
