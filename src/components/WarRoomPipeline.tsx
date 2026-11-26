import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Clock,
  Eye,
  FileText,
  Filter,
  Ghost,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
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
  WISHLIST: "bg-slate-100 text-slate-800 border-slate-400",
  APPLIED: "bg-sky-100 text-sky-900 border-sky-500",
  SCREENING: "bg-indigo-100 text-indigo-900 border-indigo-500",
  INTERVIEW: "bg-amber-100 text-amber-950 border-amber-500",
  OFFER: "bg-emerald-100 text-emerald-900 border-emerald-600",
  REJECTED: "bg-rose-100 text-rose-900 border-rose-500",
  GHOSTED: "bg-purple-100 text-purple-900 border-purple-500",
};

const MATCH_BADGE_CLASS: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-600",
  medium: "bg-amber-100 text-amber-950 border-amber-500",
  low: "bg-rose-100 text-rose-900 border-rose-500",
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
}: WarRoomPipelineProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApplicationStatus>(
    "ALL",
  );
  const [onlyGhostingRisk, setOnlyGhostingRisk] = useState(false);
  const [sortBy, setSortBy] = useState<ApplicationSortBy>("newest");

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
    <div className="space-y-4">
      <ConflictBanner
        conflicts={conflicts}
        onSelectApplication={onSelectApplication}
      />

      <section className="xp-window" aria-label="Filter dan Pipeline Lamaran">
        <div className="xp-titlebar">
          <span className="inline-flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            War Room Pipeline Lamaran
          </span>
          <span className="font-mono text-[11px] bg-xp-deep/70 px-1.5 py-0.5 rounded-sm">
            {filteredApplications.length} / {applications.length} lamaran
          </span>
        </div>

        <div className="p-3.5 space-y-3">
          {/* Toolbar Filter Gabungan */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-xp-paper border border-xp-border p-2.5">
            <div className="md:col-span-4 relative">
              <label htmlFor="warroom-search" className="sr-only">
                Cari lamaran
              </label>
              <Search
                className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="warroom-search"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari perusahaan, posisi, CV, atau skill..."
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

            <div className="md:col-span-2 flex items-center justify-end">
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

          {/* Daftar Lamaran */}
          {applications.length === 0 ? (
            <div className="xp-paper p-8 text-center space-y-2.5">
              <p className="text-sm font-bold text-xp-deep">
                Belum ada lamaran di War Room Kapten.
              </p>
              <p className="text-xs text-slate-600">
                Simpan lowongan dari Eksplorasi Lowongan atau catat lamaran
                secara manual untuk mulai melacak progres.
              </p>
              {onOpenCreateModal && (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="xp-btn xp-btn-green"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Catat Lamaran Pertama
                </button>
              )}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="xp-paper p-6 text-center space-y-2.5">
              <p className="text-sm font-bold text-xp-ink">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredApplications.map((app) => {
                const match = calculateSkillMatch(
                  userSkills,
                  app.requiredSkills,
                );
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
                    className={`xp-paper p-3.5 flex flex-col justify-between gap-3 ${
                      isConflicting ? "ring-2 ring-xp-danger" : ""
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Header Kartu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-xp-deep truncate">
                            {app.role}
                          </h3>
                          <p className="text-xs text-slate-700 font-bold">
                            {app.company}{" "}
                            <span className="font-normal text-slate-500">
                              • {app.workMode}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${STATUS_BADGE_CLASS[app.status]}`}
                          >
                            {STATUS_LABELS[app.status]}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm font-mono ${MATCH_BADGE_CLASS[match.level]}`}
                          >
                            {match.score}% Match
                          </span>
                        </div>
                      </div>

                      {/* Badges Peringatan */}
                      {(ghostRisk || isConflicting) && (
                        <div className="flex flex-wrap gap-1.5">
                          {ghostRisk && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-900 border border-xp-danger rounded-sm">
                              <Ghost className="w-3 h-3" aria-hidden="true" />
                              Rawan Ghosting ({daysSinceUpdate} hari tanpa
                              update)
                            </span>
                          )}
                          {isConflicting && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-red-900 border border-xp-danger rounded-sm">
                              <AlertTriangle
                                className="w-3 h-3"
                                aria-hidden="true"
                              />
                              Jadwal Bentrok (&lt; 60 mnt)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata: CV, Interview, Offer */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-700 bg-xp-cream/60 border border-xp-cream-border px-2.5 py-1.5">
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
                            Interview:{" "}
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
                            ? "Update hari ini"
                            : `${daysSinceUpdate} hari lalu`}
                        </span>
                      </div>

                      {/* Progress Checklist */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            <CheckSquare
                              className="w-3 h-3 text-xp-bar"
                              aria-hidden="true"
                            />
                            Checklist Persiapan
                          </span>
                          <span className="font-mono font-bold text-xp-deep">
                            {completedChecklist}/{totalChecklist} selesai
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-xp-cream border border-xp-border overflow-hidden">
                          <div
                            className="h-full bg-xp-bar transition-all duration-200"
                            style={{ width: `${checklistPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Aksi Kartu */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-xp-cream-border">
                      <button
                        type="button"
                        onClick={() => onSelectApplication(app.id)}
                        className="xp-btn xp-btn-green"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Buka Detail
                      </button>

                      <div className="flex items-center gap-1.5">
                        {canSimulateGhosting && (
                          <button
                            type="button"
                            onClick={() => onSimulateGhosting(app.id)}
                            className="xp-btn text-[11px]"
                            title="Mundurkan lastUpdatedAt 15 hari untuk uji Rawan Ghosting"
                          >
                            <Ghost className="w-3.5 h-3.5" aria-hidden="true" />
                            Simulasi +15 Hari
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteApplication(app.id)}
                          aria-label={`Hapus lamaran ${app.company}`}
                          className="xp-btn xp-btn-danger px-2.5"
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
      </section>
    </div>
  );
}
