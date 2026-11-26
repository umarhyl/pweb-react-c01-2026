import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Clock,
  Eye,
  FileText,
  RotateCcw,
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
  WISHLIST: "bg-xp-cream text-xp-ink border-xp-ink",
  APPLIED: "bg-sky-100 text-sky-950 border-sky-700",
  SCREENING: "bg-indigo-100 text-indigo-950 border-indigo-700",
  INTERVIEW: "bg-amber-100 text-amber-950 border-amber-700",
  OFFER: "bg-emerald-100 text-emerald-950 border-emerald-700",
  REJECTED: "bg-rose-100 text-rose-950 border-rose-700",
  GHOSTED: "bg-purple-100 text-purple-950 border-purple-700 border-dashed",
};

const MATCH_BADGE_CLASS: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-700",
  medium: "bg-amber-100 text-amber-950 border-amber-600",
  low: "bg-rose-100 text-rose-900 border-rose-700",
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

      if (isEditable) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
        const timeA =
          a.status === "INTERVIEW" && a.interviewDateTime
            ? Date.parse(a.interviewDateTime)
            : Number.POSITIVE_INFINITY;
        const timeB =
          b.status === "INTERVIEW" && b.interviewDateTime
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
    <div className="space-y-5">
      {showConflictBanner && (
        <ConflictBanner
          conflicts={conflicts}
          onSelectApplication={onSelectApplication}
        />
      )}

      {/* Clean Editorial Toolbar */}
      <section className="xp-paper p-5 space-y-4" aria-label="Filter Pipeline Lamaran">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="xp-eyebrow">WAR_ROOM_PIPELINE.EXE</span>
            <h2 className="font-display text-xl font-bold text-xp-deep flex items-center gap-2">
              <img
                src={RETRO_ICONS.pipeline}
                alt=""
                width={18}
                height={18}
                className="xp-pixel"
              />
              Pipeline Lamaran Kapten
            </h2>
          </div>

          <span className="font-mono text-xs font-bold text-xp-deep bg-xp-soft px-2.5 py-1 border border-xp-border">
            {filteredApplications.length} / {applications.length} lamaran
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <label htmlFor="warroom-search" className="sr-only">
              Cari lamaran
            </label>
            <img
              src={RETRO_ICONS.search}
              alt=""
              width={14}
              height={14}
              className="xp-pixel absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              id="warroom-search"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari perusahaan, posisi, CV, atau skill... (tekan /)"
              className="xp-input pl-8 text-xs"
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
              className="xp-input text-xs"
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
              className="xp-input text-xs"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="interviewSoonest">
                Urutkan: Jadwal Interview Terdekat
              </option>
              <option value="highestOffer">Urutkan: Offer Tertinggi</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center md:justify-end">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-xp-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyGhostingRisk}
                onChange={(e) => setOnlyGhostingRisk(e.target.checked)}
                className="accent-xp-danger"
              />
              <span>Rawan Ghosting ({ghostingCount})</span>
            </label>
          </div>
        </div>
      </section>

      {/* Daftar Lamaran */}
      {applications.length === 0 ? (
        <div className="xp-paper p-10 text-center space-y-3">
          <img
            src={RETRO_ICONS.pipeline}
            alt=""
            width={32}
            height={32}
            className="xp-pixel mx-auto opacity-80"
          />
          <div className="space-y-1 max-w-md mx-auto">
            <p className="font-display text-lg font-bold text-xp-deep">
              Belum ada lamaran di War Room Kapten
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simpan lowongan dari tab Eksplorasi Lowongan atau catat lamaran
              secara manual untuk mulai melacak status dan jadwal interview.
            </p>
          </div>
          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="xp-btn xp-btn-green"
            >
              <img
                src={RETRO_ICONS.plus}
                alt=""
                width={13}
                height={13}
                className="xp-pixel brightness-200"
              />
              Catat Lamaran Pertama
            </button>
          )}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="xp-paper p-8 text-center space-y-3">
          <p className="font-display text-base font-bold text-xp-deep">
            Tidak ada lamaran yang cocok dengan filter saat ini.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="xp-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                className={`xp-paper p-5 flex flex-col justify-between gap-4 hover:shadow-[4px_4px_0_#003399] transition-shadow ${
                  isConflicting ? "!border-2 !border-xp-danger" : ""
                }`}
              >
                <div className="space-y-3.5">
                  {/* Header Kartu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-xp-deep leading-snug">
                        {app.role}
                      </h3>
                      <p className="text-xs text-slate-700 font-bold mt-0.5">
                        {app.company}{" "}
                        <span className="font-normal text-slate-500">
                          &middot; {app.workMode}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold border ${STATUS_BADGE_CLASS[app.status]}`}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold border font-mono ${MATCH_BADGE_CLASS[match.level]}`}
                      >
                        {match.score}%
                      </span>
                    </div>
                  </div>

                  {/* Badges Peringatan */}
                  {(ghostRisk || isConflicting) && (
                    <div className="flex flex-wrap gap-2">
                      {ghostRisk && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[#ffe0b2] text-[#7a2e00] border border-xp-ink">
                          <img
                            src={RETRO_ICONS.ghost}
                            alt=""
                            width={13}
                            height={13}
                            className="xp-pixel"
                          />
                          Rawan Ghosting ({daysSinceUpdate} hari)
                        </span>
                      )}
                      {isConflicting && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[#fff3a0] text-red-900 border border-xp-ink">
                          <img
                            src={RETRO_ICONS.conflict}
                            alt=""
                            width={13}
                            height={13}
                            className="xp-pixel"
                          />
                          Jadwal Bentrok (&lt; 60 mnt)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata Strip */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-700 xp-card-soft px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      <FileText
                        className="w-3 h-3 text-xp-deep"
                        aria-hidden="true"
                      />
                      CV: <strong>{app.cvVersion || "-"}</strong>
                    </span>

                    {app.interviewDateTime && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock
                          className="w-3 h-3 text-xp-deep"
                          aria-hidden="true"
                        />
                        <strong className="font-mono">
                          {formatDateTime(app.interviewDateTime)}
                        </strong>
                      </span>
                    )}

                    {typeof app.salaryOffer === "number" &&
                      app.salaryOffer > 0 && (
                        <span className="inline-flex items-center gap-1 text-xp-green font-bold">
                          Offer: {formatCurrency(app.salaryOffer)}
                        </span>
                      )}

                    <span className="inline-flex items-center gap-1 ml-auto text-slate-500">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {daysSinceUpdate === 0
                        ? "Hari ini"
                        : `${daysSinceUpdate} hari lalu`}
                    </span>
                  </div>

                  {/* Checklist Progress (Win98 Segmented Bar) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                        <img
                          src={RETRO_ICONS.checklist}
                          alt=""
                          width={13}
                          height={13}
                          className="xp-pixel"
                        />
                        Checklist Persiapan
                      </span>
                      <span className="font-mono font-bold text-xp-deep">
                        {completedChecklist}/{totalChecklist} selesai
                      </span>
                    </div>
                    <div className="xp-progress">
                      <div
                        className="xp-progress-fill"
                        style={{ width: `${checklistPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-xp-cream-border">
                  <button
                    type="button"
                    onClick={() => onSelectApplication(app.id)}
                    className="xp-btn xp-btn-green"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    Buka Detail
                  </button>

                  <div className="flex items-center gap-2">
                    {canSimulateGhosting && (
                      <button
                        type="button"
                        onClick={() => onSimulateGhosting(app.id)}
                        className="xp-btn text-[11px]"
                        title="Mundurkan lastUpdatedAt 15 hari untuk uji Rawan Ghosting"
                      >
                        <img
                          src={RETRO_ICONS.ghost}
                          alt=""
                          width={13}
                          height={13}
                          className="xp-pixel"
                        />
                        Simulasi +15 Hari
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteApplication(app.id)}
                      aria-label={`Hapus lamaran ${app.company}`}
                      className="xp-btn xp-btn-danger px-3"
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
