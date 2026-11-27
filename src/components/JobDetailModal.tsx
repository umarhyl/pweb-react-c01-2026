import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  ExternalLink,
  MapPin,
  Send,
  Wallet,
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

type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const MATCH_BADGE_STYLES: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-300",
  medium: "bg-warn-soft text-amber-900 border-amber-300",
  low: "bg-danger-soft text-danger border-danger/35",
};

const PREVIEW_BLOCK_LIMIT = 2;
const PREVIEW_CHAR_LIMIT = 240;

function parseDescriptionBlocks(raw: string): DescriptionBlock[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const blocks: DescriptionBlock[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
      currentList = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      const headingText = line.slice(3).trim();
      if (headingText.length > 0) {
        blocks.push({ type: "heading", text: headingText });
      }
      continue;
    }

    if (line.startsWith("- ")) {
      const itemText = line.slice(2).trim();
      if (itemText.length > 0) {
        currentList.push(itemText);
      }
      continue;
    }

    flushList();

    const isShortHeading =
      line.length <= 55 &&
      (line.endsWith(":") || /^[A-Z][A-Za-z0-9\s/&()-]+$/.test(line));

    if (isShortHeading) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  flushList();
  return blocks;
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}...`;
}

function formatPublishDate(raw?: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function JobDetailModal({
  job,
  match,
  existingApplication,
  onClose,
  onSaveToWishlist,
  onQuickApply,
  onOpenInWarRoom,
}: JobDetailModalProps) {
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

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

  const descriptionBlocks = useMemo(() => {
    if (!job) return [];
    const source =
      job.description ??
      `Posisi ${job.title} di ${job.company_name} (${job.candidate_required_location}).`;
    return parseDescriptionBlocks(source);
  }, [job]);

  if (!job || !match) return null;

  const isExpanded = expandedJobId === job.id;
  const firstBlockTooLong =
    descriptionBlocks.length > 0 &&
    descriptionBlocks[0].type === "paragraph" &&
    descriptionBlocks[0].text.length > PREVIEW_CHAR_LIMIT;
  const canExpand =
    descriptionBlocks.length > PREVIEW_BLOCK_LIMIT || firstBlockTooLong;

  const visibleBlocks = isExpanded
    ? descriptionBlocks
    : descriptionBlocks.slice(0, PREVIEW_BLOCK_LIMIT);

  const totalSkills = match.matchedSkills.length + match.missingSkills.length;
  const publishedLabel = formatPublishDate(job.publication_date);

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
            {job.company_name}
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
          <div className="space-y-3 pb-4 border-b border-line">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="craft-eyebrow">{job.category}</span>
                <h2 className="font-pixel text-2xl font-bold text-ink leading-snug">
                  {job.title}
                </h2>
                <p className="text-xs font-semibold text-muted">
                  {job.company_name}
                </p>
              </div>

              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${MATCH_BADGE_STYLES[match.level]}`}
              >
                {match.score}% Match
              </span>
            </div>

            {/* Quick Info Strip */}
            <div className="flex flex-wrap gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-soft border border-line text-ink">
                <MapPin className="w-3 h-3 text-leaf" aria-hidden="true" />
                {job.candidate_required_location}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-soft border border-line text-ink font-semibold">
                <Wallet className="w-3 h-3 text-leaf" aria-hidden="true" />
                {job.salary.trim().length > 0
                  ? job.salary
                  : "Gaji tidak dicantumkan"}
              </span>
              {publishedLabel && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-soft border border-line text-muted">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  {publishedLabel}
                </span>
              )}
            </div>
          </div>

          {/* Deskripsi Terstruktur */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-ink">Deskripsi Posisi</h3>
            <div className="text-xs sm:text-[13px] text-ink leading-relaxed bg-cream-soft border border-line rounded-2xl p-4 space-y-2.5">
              {visibleBlocks.map((block, index) => {
                if (block.type === "heading") {
                  return (
                    <h4
                      key={`h-${index}`}
                      className="text-xs sm:text-[13px] font-bold text-ink pt-1"
                    >
                      {block.text}
                    </h4>
                  );
                }

                if (block.type === "list") {
                  const items = isExpanded
                    ? block.items
                    : block.items.slice(0, 4);
                  return (
                    <ul
                      key={`l-${index}`}
                      className="list-disc pl-5 space-y-1 text-ink/90"
                    >
                      {items.map((item, itemIdx) => (
                        <li key={`li-${index}-${itemIdx}`}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                const text =
                  !isExpanded && index === 0
                    ? truncateAtWord(block.text, PREVIEW_CHAR_LIMIT)
                    : block.text;
                return (
                  <p key={`p-${index}`} className="text-ink/90">
                    {text}
                  </p>
                );
              })}

              {canExpand && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedJobId(isExpanded ? null : job.id)
                  }
                  className="text-xs font-semibold text-leaf hover:underline cursor-pointer pt-0.5"
                >
                  {isExpanded ? "Tampilkan lebih ringkas" : "Lihat deskripsi lengkap"}
                </button>
              )}
            </div>
          </div>

          {/* Kecocokan Skill */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-ink">
              Kecocokan Skill ({match.matchedSkills.length}/{totalSkills} cocok)
            </h3>

            {totalSkills === 0 ? (
              <p className="text-xs italic text-muted">
                Tidak ada tag skill spesifik dari sumber lowongan.
              </p>
            ) : (
              <div className="space-y-3">
                {match.matchedSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Sudah dikuasai ({match.matchedSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matchedSkills.map((skill) => (
                        <span
                          key={`modal-matched-${skill}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300"
                        >
                          <img
                            src={RETRO_ICONS.check}
                            alt=""
                            width={10}
                            height={10}
                            className="pixel-art"
                          />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {match.missingSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-danger">
                      Belum ada di profil ({match.missingSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missingSkills.map((skill) => (
                        <span
                          key={`modal-missing-${skill}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-danger-soft/75 text-danger border border-dashed border-danger/40"
                        >
                          <img
                            src={RETRO_ICONS.cross}
                            alt=""
                            width={9}
                            height={9}
                            className="pixel-art"
                          />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3.5 border-t border-line flex flex-wrap items-center justify-between gap-2.5">
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
