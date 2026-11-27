import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import type {
  Application,
  ApplicationSortBy,
  ApplicationStatus,
} from "../types";
import {
  STATUS_LABELS,
  calculateSkillMatch,
  findInterviewConflicts,
  getConflictingApplicationIds,
  getDaysSinceUpdate,
  isGhostingRisk,
} from "../utils";
import type { MatchLevel } from "../utils";
import { ConflictBanner } from "./ConflictBanner";

interface WarRoomPipelineProps {
  applications: readonly Application[];
  userSkills: readonly string[];
  onSelectApplication: (applicationId: string) => void;
  onSimulateGhosting: (applicationId: string) => void;
  onDeleteApplication: (applicationId: string) => void;
  onOpenCreateModal?: () => void;
  showConflictBanner?: boolean;
}

const ALL_STATUSES: readonly ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

const STATUS_BADGE_CLASS: Readonly<Record<ApplicationStatus, string>> = {
  WISHLIST: "bg-cream-soft text-ink border-line-strong",
  APPLIED: "bg-sky-soft text-sky-deep border-sky",
  SCREENING: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/70",
  INTERVIEW: "bg-warn-soft text-amber-900 border-amber-300 dark:text-amber-200 dark:border-amber-500/50",
  OFFER: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/70",
  REJECTED: "bg-danger-soft text-danger border-danger/35",
  GHOSTED: "bg-purple-50 text-purple-800 border-purple-300 border-dashed dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700/70",
};

const MATCH_BADGE_CLASS: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/70",
  medium: "bg-warn-soft text-amber-900 border-amber-300 dark:text-amber-200 dark:border-amber-500/50",
  low: "bg-danger-soft text-danger border-danger/35",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateTime?: string): string {
  if (!dateTime) return "-";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function WarRoomPipeline({
  applications,
  userSkills,
  onSelectApplication,
  onSimulateGhosting,
  onDeleteApplication,
  onOpenCreateModal,
  showConflictBanner = true,
}: WarRoomPipelineProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApplicationStatus>(
    "ALL",
  );
  const [onlyGhostingRisk, setOnlyGhostingRisk] = useState(false);
  const [sortBy, setSortBy] = useState<ApplicationSortBy>("newest");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      if (isEditable || document.querySelector('[role="dialog"]')) return;

      event.preventDefault();
      event.stopPropagation();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  // Cek bentrok WAJIB dari seluruh data, bukan dari data yang sudah ter-filter
  const conflicts = useMemo(
    () => findInterviewConflicts(applications),
    [applications],
  );

  const conflictingIds = useMemo(
    () => getConflictingApplicationIds(applications),
    [applications],
  );

  const ghostingCount = useMemo(
    () => applications.filter((app) => isGhostingRisk(app)).length,
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = applications.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) {
        return false;
      }

      if (onlyGhostingRisk && !isGhostingRisk(app)) {
        return false;
      }

      if (query.length > 0) {
        const haystack = [
          app.company,
          app.role,
          app.workMode,
          app.cvVersion ?? "",
          ...app.requiredSkills,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "interviewSoonest") {
        const isActiveInterviewA =
          a.status === "INTERVIEW" && Boolean(a.interviewDateTime);
        const isActiveInterviewB =
          b.status === "INTERVIEW" && Boolean(b.interviewDateTime);

        if (isActiveInterviewA !== isActiveInterviewB) {
          return isActiveInterviewA ? -1 : 1;
        }

        const timeA = a.interviewDateTime
          ? Date.parse(a.interviewDateTime)
          : Number.POSITIVE_INFINITY;
        const timeB = b.interviewDateTime
          ? Date.parse(b.interviewDateTime)
          : Number.POSITIVE_INFINITY;

        const safeA = Number.isNaN(timeA) ? Number.POSITIVE_INFINITY : timeA;
        const safeB = Number.isNaN(timeB) ? Number.POSITIVE_INFINITY : timeB;
        if (safeA !== safeB) return safeA - safeB;
      }

      if (sortBy === "highestOffer") {
        const offerA = a.salaryOffer ?? -1;
        const offerB = b.salaryOffer ?? -1;
        if (offerA !== offerB) return offerB - offerA;
      }

      const updatedA = Date.parse(a.lastUpdatedAt) || 0;
      const updatedB = Date.parse(b.lastUpdatedAt) || 0;
      return updatedB - updatedA;
    });
  }, [applications, searchText, statusFilter, onlyGhostingRisk, sortBy]);

  const hasActiveFilter =
    searchText.trim().length > 0 ||
    statusFilter !== "ALL" ||
    onlyGhostingRisk;

  const handleResetFilters = () => {
    setSearchText("");
    setStatusFilter("ALL");
    setOnlyGhostingRisk(false);
    setSortBy("newest");
  };

  return (
    <div className="space-y-4">
      {showConflictBanner && (
        <ConflictBanner
          conflicts={conflicts}
          onSelectApplication={onSelectApplication}
        />
      )}

      {/* Filter Toolbar */}
      <section className="craft-card p-5 space-y-4" aria-label="Filter Pipeline Lamaran">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="craft-eyebrow">War Room Pipeline</span>
            <h2 className="font-pixel text-xl font-bold text-ink flex items-center gap-2">
              <img
                src={RETRO_ICONS.pipeline}
                alt=""
                width={18}
                height={18}
                className="pixel-art"
              />
              Pipeline Lamaran Kapten
            </h2>
          </div>

          <span className="text-xs font-semibold text-leaf-deep bg-leaf-soft px-3 py-1 rounded-full border border-leaf/30">
            {filteredApplications.length} / {applications.length} lamaran
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <label htmlFor="warroom-search" className="sr-only">
              Cari lamaran
            </label>
            <Search
              className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id="warroom-search"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari perusahaan, posisi, CV, atau skill... (/)"
              className="craft-input pl-9 text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="warroom-status-filter" className="sr-only">
              Filter status lamaran
            </label>
            <select
              id="warroom-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | ApplicationStatus)
              }
              className="craft-input text-xs"
            >
              <option value="ALL">Semua Status</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="warroom-sort" className="sr-only">
              Urutkan lamaran
            </label>
            <select
              id="warroom-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ApplicationSortBy)}
              className="craft-input text-xs"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="interviewSoonest">
                Urutkan: Jadwal Interview Terdekat
              </option>
              <option value="highestOffer">Urutkan: Offer Tertinggi</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center md:justify-end">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-cream-soft border border-line text-xs font-semibold text-ink cursor-pointer select-none hover:border-danger/50 transition-colors">
              <input
                type="checkbox"
                checked={onlyGhostingRisk}
                onChange={(e) => setOnlyGhostingRisk(e.target.checked)}
                className="accent-danger"
              />
              <span>Ghosting ({ghostingCount})</span>
            </label>
          </div>
        </div>
      </section>

      {/* Daftar Lamaran */}
      {applications.length === 0 ? (
        <div className="craft-card p-10 text-center space-y-3.5">
          <img
            src={RETRO_ICONS.pipeline}
            alt=""
            width={36}
            height={36}
            className="pixel-art mx-auto opacity-85"
          />
          <div className="space-y-1 max-w-md mx-auto">
            <p className="font-pixel text-xl font-bold text-ink">
              Belum ada lamaran di War Room Kapten
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Simpan lowongan dari tab Eksplorasi atau catat lamaran secara
              manual untuk mulai melacak status dan jadwal interview.
            </p>
          </div>
          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="craft-btn craft-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Catat Lamaran Pertama
            </button>
          )}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="craft-card p-8 text-center space-y-3">
          <p className="font-pixel text-lg font-bold text-ink">
            Tidak ada lamaran yang cocok dengan filter saat ini.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="craft-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApplications.map((app) => {
            const match = calculateSkillMatch(userSkills, app.requiredSkills);
            const ghostRisk = isGhostingRisk(app);
            const daysSinceUpdate = getDaysSinceUpdate(app.lastUpdatedAt);
            const isConflicting = conflictingIds.has(app.id);
            const completedChecklist = app.checklist.filter(
              (item) => item.done,
            ).length;
            const totalChecklist = app.checklist.length;
            const checklistPercent =
              totalChecklist > 0
                ? Math.round((completedChecklist / totalChecklist) * 100)
                : 0;
            const canSimulateGhosting =
              app.status === "APPLIED" || app.status === "SCREENING";

            return (
              <article
                key={app.id}
                className={`craft-card craft-card-hover p-5 flex flex-col justify-between gap-4 ${
                  isConflicting ? "border-danger/60 ring-2 ring-danger/15" : ""
                }`}
              >
                <div className="space-y-3.5">
                  {/* Header Kartu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-pixel text-lg font-bold text-ink leading-snug">
                        {app.role}
                      </h3>
                      <p className="text-xs text-ink font-semibold mt-0.5">
                        {app.company}{" "}
                        <span className="font-normal text-muted">
                          &middot; {app.workMode}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_BADGE_CLASS[app.status]}`}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${MATCH_BADGE_CLASS[match.level]}`}
                      >
                        {match.score}%
                      </span>
                    </div>
                  </div>

                  {/* Badges Peringatan */}
                  {(ghostRisk || isConflicting) && (
                    <div className="flex flex-wrap gap-2">
                      {ghostRisk && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-warn-soft dark:text-amber-200 dark:border-amber-500/50">
                          <img
                            src={RETRO_ICONS.ghost}
                            alt=""
                            width={13}
                            height={13}
                            className="pixel-art"
                          />
                          Rawan Ghosting ({daysSinceUpdate} hari)
                        </span>
                      )}
                      {isConflicting && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-danger-soft text-danger border border-danger/40">
                          <img
                            src={RETRO_ICONS.conflict}
                            alt=""
                            width={13}
                            height={13}
                            className="pixel-art"
                          />
                          Jadwal Bentrok (&lt; 60 mnt)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata Strip */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted craft-card-warm px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      <FileText
                        className="w-3.5 h-3.5 text-wood"
                        aria-hidden="true"
                      />
                      CV: <strong className="text-ink">{app.cvVersion || "-"}</strong>
                    </span>

                    {app.interviewDateTime && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock
                          className="w-3.5 h-3.5 text-leaf-deep"
                          aria-hidden="true"
                        />
                        <strong className="font-mono text-ink">
                          {formatDateTime(app.interviewDateTime)}
                        </strong>
                      </span>
                    )}

                    {typeof app.salaryOffer === "number" &&
                      app.salaryOffer > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                          Offer: {formatCurrency(app.salaryOffer)}
                        </span>
                      )}

                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-leaf hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        Web Asli
                      </a>
                    )}

                    <span className="inline-flex items-center gap-1 ml-auto text-muted">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {daysSinceUpdate === 0
                        ? "Hari ini"
                        : `${daysSinceUpdate} hari lalu`}
                    </span>
                  </div>

                  {/* Checklist Progress (Soft Track + Retro Segmented Fill) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        <img
                          src={RETRO_ICONS.checklist}
                          alt=""
                          width={13}
                          height={13}
                          className="pixel-art"
                        />
                        Checklist Persiapan
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-leaf-deep">
                        {completedChecklist}/{totalChecklist} selesai
                      </span>
                    </div>
                    <div className="craft-progress">
                      <div
                        className="craft-progress-fill"
                        style={{ width: `${checklistPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => onSelectApplication(app.id)}
                    className="craft-btn craft-btn-primary py-1.5 px-3.5"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    Buka Detail
                  </button>

                  <div className="flex items-center gap-2">
                    {canSimulateGhosting && (
                      <button
                        type="button"
                        onClick={() => onSimulateGhosting(app.id)}
                        className="craft-btn py-1.5 px-3 text-[11.5px]"
                        title="Mundurkan lastUpdatedAt 15 hari untuk uji Rawan Ghosting"
                      >
                        <img
                          src={RETRO_ICONS.ghost}
                          alt=""
                          width={13}
                          height={13}
                          className="pixel-art"
                        />
                        Simulasi +15 Hari
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteApplication(app.id)}
                      aria-label={`Hapus lamaran ${app.company}`}
                      className="craft-btn craft-btn-danger py-1.5 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
