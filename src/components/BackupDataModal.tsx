import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";

interface BackupDataModalProps {
  isOpen: boolean;
  applicationsCount: number;
  skillsCount: number;
  onClose: () => void;
  onExportBackup: () => void;
  onTriggerImport: () => void;
  onResetAllData: () => void;
}

export function BackupDataModal({
  isOpen,
  applicationsCount,
  skillsCount,
  onClose,
  onExportBackup,
  onTriggerImport,
  onResetAllData,
}: BackupDataModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/55 dark:bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="craft-modal craft-animate-in w-full max-w-lg my-auto">
        {/* XP Blue Pixel Header */}
        <div className="craft-modal-header">
          <span
            id="backup-modal-title"
            className="inline-flex items-center gap-2 font-sans font-bold text-sm tracking-tight text-white"
          >
            <img
              src={RETRO_ICONS.floppy}
              alt=""
              width={16}
              height={16}
              className="pixel-art"
            />
            Backup &amp; Memori Lokal
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela backup data"
            className="craft-win-dot cursor-pointer hover:bg-danger hover:border-danger hover:text-white"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4 bg-paper">
          {/* Compact Pixel Inventory Strip */}
          <div className="rounded-2xl bg-cream-soft border border-line p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0">
                <img
                  src={RETRO_ICONS.sleepingCat}
                  alt=""
                  width={26}
                  height={18}
                  className="pixel-art"
                />
              </div>
              <div className="min-w-0">
                <p className="font-pixel text-sm font-bold text-ink leading-tight">
                  Data Browser (.json)
                </p>
                <p className="text-[11px] text-muted">
                  Lamaran, CV, checklist, log &amp; skill Kapten
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-line text-[11px] font-semibold text-ink">
                <img
                  src={RETRO_ICONS.briefcase}
                  alt=""
                  width={12}
                  height={12}
                  className="pixel-art"
                />
                {applicationsCount} Lamaran
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-line text-[11px] font-semibold text-ink">
                <img
                  src={RETRO_ICONS.skill}
                  alt=""
                  width={12}
                  height={12}
                  className="pixel-art"
                />
                {skillsCount} Skill
              </span>
            </div>
          </div>

          {/* 2-Column Tactile Pixel Cards: Export & Import */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="craft-card-flat bg-surface p-4 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-soft border border-sky/80 flex items-center justify-center">
                  <img
                    src={RETRO_ICONS.floppy}
                    alt=""
                    width={28}
                    height={28}
                    className="pixel-art"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-pixel text-base font-bold text-ink">
                    Simpan Backup
                  </h3>
                  <p className="text-[11.5px] text-muted leading-snug">
                    Export seluruh data ke file <code className="font-mono text-[10.5px]">.json</code> untuk cadangan atau pindah perangkat.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onExportBackup();
                  onClose();
                }}
                className="craft-btn craft-btn-primary w-full py-2"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Unduh .json
              </button>
            </div>

            <div className="craft-card-flat bg-surface p-4 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-cream-soft border border-line-strong/80 flex items-center justify-center">
                  <img
                    src={RETRO_ICONS.folderOpen}
                    alt=""
                    width={28}
                    height={28}
                    className="pixel-art"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-pixel text-base font-bold text-ink">
                    Pulihkan Backup
                  </h3>
                  <p className="text-[11.5px] text-muted leading-snug">
                    Import file <code className="font-mono text-[10.5px]">.json</code> lama untuk mengembalikan semua lamaran &amp; skill.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerImport();
                }}
                className="craft-btn w-full py-2"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Pilih File .json
              </button>
            </div>
          </div>

          {/* Compact Reset Footer Strip */}
          <div className="rounded-2xl bg-danger-soft/50 border border-danger/30 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-surface border border-danger/30 flex items-center justify-center shrink-0">
                <img
                  src={RETRO_ICONS.trash}
                  alt=""
                  width={18}
                  height={18}
                  className="pixel-art"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-danger leading-tight">
                  Reset Semua Data
                </p>
                <p className="text-[11px] text-muted truncate">
                  Hapus lamaran &amp; kembalikan skill ke default
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onResetAllData();
              }}
              className="craft-btn craft-btn-danger py-1.5 px-3.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
