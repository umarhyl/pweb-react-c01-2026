import { useEffect } from "react";
import { Database, Download, RotateCcw, Upload, X } from "lucide-react";

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/55 dark:bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="craft-modal w-full max-w-md my-auto">
        <div className="craft-modal-header">
          <span
            id="backup-modal-title"
            className="inline-flex items-center gap-2 font-pixel font-bold text-base text-white"
          >
            <Database className="w-4 h-4" aria-hidden="true" />
            Backup &amp; Kelola Data
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
          {/* Penjelasan jelas untuk user */}
          <div className="rounded-2xl bg-sky-soft/75 border border-sky p-3.5 space-y-2 text-xs text-ink">
            <p className="font-semibold text-leaf-deep">
              Apa yang disimpan di file Backup (.json)?
            </p>
            <p className="text-muted leading-relaxed">
              Seluruh <strong>daftar lamaran</strong> (status, CV, jadwal
              interview, checklist, riwayat catatan) dan{" "}
              <strong>profil skill Kapten</strong> dari browser ini. Cocok untuk
              cadangan atau pindah laptop.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-surface border border-line text-[11px] font-semibold text-ink">
                {applicationsCount} Lamaran tersimpan
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface border border-line text-[11px] font-semibold text-ink">
                {skillsCount} Skill Kapten
              </span>
            </div>
          </div>

          {/* 3 Aksi Jelas */}
          <div className="space-y-2.5">
            <div className="craft-card-flat bg-surface p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-ink">
                  Simpan Cadangan (Export)
                </p>
                <p className="text-[11px] text-muted">
                  Unduh seluruh lamaran &amp; skill sebagai file JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onExportBackup();
                  onClose();
                }}
                className="craft-btn craft-btn-primary py-1.5 px-3.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Unduh
              </button>
            </div>

            <div className="craft-card-flat bg-surface p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-ink">
                  Pulihkan Data (Import)
                </p>
                <p className="text-[11px] text-muted">
                  Muat ulang data dari file backup JSON yang pernah diunduh.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerImport();
                }}
                className="craft-btn py-1.5 px-3.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Pilih File
              </button>
            </div>

            <div className="craft-card-flat bg-danger-soft/45 border-danger/30 p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-danger">
                  Reset Semua Data
                </p>
                <p className="text-[11px] text-muted">
                  Hapus seluruh lamaran &amp; kembalikan skill ke default awal.
                </p>
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
      </div>
    </div>
  );
}
