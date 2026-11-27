import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  MapPin,
  Send,
  X,
} from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import type { Application, JobListing } from "../types";
import { STATUS_LABELS } from "../utils";
import type { MatchLevel, SkillMatchResult } from "../utils";

interface JobDetailModalProps {
  job: JobListing | null;
  match: SkillMatchResult | null;
  existingApplication: Application | null;
  onClose: () => void;
  onSaveToWishlist: (job: JobListing) => void;
  onQuickApply: (job: JobListing) => void;
  onOpenInWarRoom: (applicationId: string) => void;
}

const MATCH_BADGE_STYLES: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/70",
  medium: "bg-warn-soft text-amber-900 border-amber-300 dark:text-amber-200 dark:border-amber-500/50",
  low: "bg-danger-soft text-danger border-danger/35",
};

export function JobDetailModal({
  job,
  match,
  existingApplication,
  onClose,
  onSaveToWishlist,
  onQuickApply,
  onOpenInWarRoom,
}: JobDetailModalProps) {
  useEffect(() => {
    if (!job) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [job, onClose]);

  if (!job || !match) return null;

  const trimmedDescription =
    job.description && job.description.length > 520
      ? `${job.description.slice(0, 520)}...`
      : job.description;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/55 dark:bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="craft-modal w-full max-w-2xl my-auto">
        <div className="craft-modal-header">
          <span
            id="job-detail-modal-title"
            className="inline-flex items-center gap-2 font-pixel font-bold text-base text-white truncate"
          >
            <img
              src={RETRO_ICONS.briefcase}
              alt=""
              width={16}
              height={16}
              className="pixel-art shrink-0"
            />
            Detail Lowongan: {job.company_name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail lowongan"
            className="craft-win-dot cursor-pointer hover:bg-danger hover:border-danger hover:text-white shrink-0"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 bg-paper max-h-[82vh] overflow-y-auto craft-scroll">
          {/* Header Info */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
            <div className="space-y-1 min-w-0">
              <span className="craft-eyebrow">{job.category}</span>
              <h2 className="font-pixel text-2xl font-bold text-ink leading-snug">
                {job.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <strong className="text-ink">{job.company_name}</strong>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {job.candidate_required_location}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${MATCH_BADGE_STYLES[match.level]}`}
              >
                {match.score}% Skill Match
              </span>
              <span className="text-xs font-semibold text-ink">
                {job.salary.trim().length > 0
                  ? job.salary
                  : "Gaji tidak dicantumkan"}
              </span>
            </div>
          </div>

          {/* Ringkasan Deskripsi */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Deskripsi Posisi
            </h3>
            <p className="text-xs sm:text-[13px] text-ink leading-relaxed bg-cream-soft border border-line rounded-2xl p-4">
              {trimmedDescription ??
                `Posisi ${job.title} di ${job.company_name} (${job.candidate_required_location}). Buka halaman karir resmi untuk membaca detail tanggung jawab, durasi magang, dan form pendaftaran langsung.`}
            </p>
          </div>

          {/* Kecocokan Skill */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Analisis Skill Kapten ({match.matchedSkills.length} dari{" "}
              {match.matchedSkills.length + match.missingSkills.length} cocok)
            </h3>
            {job.tags.length === 0 ? (
              <p className="text-xs italic text-muted">
                Tidak ada tag skill spesifik dari sumber lowongan.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {match.matchedSkills.map((skill) => (
                  <span
                    key={`modal-matched-${skill}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/70"
                  >
                    <img
                      src={RETRO_ICONS.check}
                      alt=""
                      width={11}
                      height={11}
                      className="pixel-art"
                    />
                    {skill}
                  </span>
                ))}
                {match.missingSkills.map((skill) => (
                  <span
                    key={`modal-missing-${skill}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-danger-soft/75 text-danger border border-dashed border-danger/40"
                  >
                    <img
                      src={RETRO_ICONS.cross}
                      alt=""
                      width={10}
                      height={10}
                      className="pixel-art"
                    />
                    {skill} (missing)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Panduan Alur Melamar */}
          <div className="rounded-2xl bg-sky-soft/75 border border-sky p-4 text-xs text-ink space-y-1">
            <p className="font-semibold text-leaf-deep">
              Alur Melamar Lowongan Ini:
            </p>
            <p className="text-muted leading-relaxed">
              1) Klik <strong>Buka Web Asli</strong> untuk melamar di portal
              resmi perusahaan, lalu 2) klik{" "}
              <strong>Simpan ke Wishlist</strong> atau{" "}
              <strong>Catat Sudah Melamar (Applied)</strong> agar progres,
              versi CV, jadwal interview, dan offer terlacak di War Room.
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2.5">
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="craft-btn"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Buka Web Asli
              </a>
            ) : (
              <span className="text-xs text-muted">
                Link portal eksternal tidak tersedia
              </span>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {existingApplication ? (
                <>
                  <button type="button" disabled className="craft-btn">
                    <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    {existingApplication.status === "WISHLIST"
                      ? "Sudah di Wishlist"
                      : `Sudah Dilamar (${STATUS_LABELS[existingApplication.status]})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInWarRoom(existingApplication.id);
                    }}
                    className="craft-btn craft-btn-primary"
                  >
                    Kelola di War Room
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSaveToWishlist(job)}
                    className="craft-btn"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    Simpan ke Wishlist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickApply(job);
                    }}
                    className="craft-btn craft-btn-primary"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Catat Applied
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
