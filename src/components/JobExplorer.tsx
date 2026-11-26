import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import { useDebounce } from "../hooks";
import { fetchJobs, isAbortError } from "../services";
import type { Application, JobDataSource, JobListing } from "../types";
import { STATUS_LABELS, calculateSkillMatch } from "../utils";
import type { MatchLevel } from "../utils";
import { JobDetailModal } from "./JobDetailModal";

type JobSortOption = "matchDesc" | "matchAsc" | "default";

interface JobExplorerProps {
  kaptenSkills: readonly string[];
  applications: readonly Application[];
  dataSource: JobDataSource;
  onChangeDataSource: (source: JobDataSource) => void;
  onSaveToWishlist: (job: JobListing) => void;
  onQuickApply: (job: JobListing) => void;
  onOpenInWarRoom: (applicationId: string) => void;
}

const MATCH_BADGE_STYLES: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-300",
  medium: "bg-warn-soft text-amber-900 border-amber-300",
  low: "bg-danger-soft text-danger border-danger/35",
};

function getCompanyInitials(companyName: string): string {
  const cleaned = companyName
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ");
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function findMatchingApplication(
  applications: readonly Application[],
  company: string,
  role: string,
): Application | null {
  const normCompany = company.trim().toLowerCase();
  const normRole = role.trim().toLowerCase();
  return (
    applications.find(
      (app) =>
        app.company.trim().toLowerCase() === normCompany &&
        app.role.trim().toLowerCase() === normRole,
    ) ?? null
  );
}

export function JobExplorer({
  kaptenSkills,
  applications,
  dataSource,
  onChangeDataSource,
  onSaveToWishlist,
  onQuickApply,
  onOpenInWarRoom,
}: JobExplorerProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<JobSortOption>("matchDesc");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedKeyword = useDebounce(keyword, 400);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await fetchJobs(dataSource, controller.signal);
        setJobs(result);
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengambil data lowongan.";
        setErrorMessage(message);
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      controller.abort();
    };
  }, [dataSource, retryCount]);

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

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const job of jobs) {
      if (job.category.trim().length > 0) {
        unique.add(job.category.trim());
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const effectiveCategory =
    selectedCategory === "ALL" || categories.includes(selectedCategory)
      ? selectedCategory
      : "ALL";

  const enrichedJobs = useMemo(() => {
    const normalizedQuery = debouncedKeyword.trim().toLowerCase();

    const matchedList = jobs
      .filter((job) => {
        if (effectiveCategory !== "ALL" && job.category !== effectiveCategory) {
          return false;
        }

        if (normalizedQuery.length === 0) return true;

        const searchable = [
          job.title,
          job.company_name,
          job.candidate_required_location,
          job.category,
          ...job.tags,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .map((job) => {
        const existingApplication = findMatchingApplication(
          applications,
          job.company_name,
          job.title,
        );
        return {
          job,
          match: calculateSkillMatch(kaptenSkills, job.tags),
          existingApplication,
          alreadyApplied: existingApplication !== null,
        };
      });

    if (sortBy === "matchDesc") {
      return [...matchedList].sort((a, b) => b.match.score - a.match.score);
    }

    if (sortBy === "matchAsc") {
      return [...matchedList].sort((a, b) => a.match.score - b.match.score);
    }

    return matchedList;
  }, [jobs, effectiveCategory, debouncedKeyword, kaptenSkills, applications, sortBy]);

  const selectedEntry = useMemo(
    () => enrichedJobs.find((entry) => entry.job.id === selectedJobId) ?? null,
    [enrichedJobs, selectedJobId],
  );

  const isDebouncing = keyword !== debouncedKeyword;
  const hasActiveFilters =
    keyword.trim().length > 0 || effectiveCategory !== "ALL";

  const handleResetFilters = () => {
    setKeyword("");
    setSelectedCategory("ALL");
    setSortBy("matchDesc");
  };

  return (
    <section className="space-y-4" aria-label="Eksplorasi Lowongan">
      {/* Filter & Search Toolbar */}
      <div className="craft-card p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="craft-eyebrow">Job Explorer</span>
            <h2 className="font-pixel text-xl font-bold text-ink flex items-center gap-2">
              <img
                src={RETRO_ICONS.briefcase}
                alt=""
                width={18}
                height={18}
                className="pixel-art shrink-0"
              />
              Daftar Lowongan Magang
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="px-2.5 py-1 rounded-full bg-cream-soft border border-line">
              <strong className="text-ink">{enrichedJobs.length}</strong> /{" "}
              {jobs.length} lowongan &middot;{" "}
              {dataSource === "live" ? "Remotive Live" : "Dataset Lokal"}
            </span>
            {isDebouncing && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-sky-soft text-sky-deep border border-sky">
                menyaring...
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_170px] gap-2.5">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="job-search-input" className="sr-only">
              Cari posisi, perusahaan, atau skill
            </label>
            <input
              ref={searchInputRef}
              id="job-search-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari posisi, perusahaan, atau skill... (tekan /)"
              className="craft-input pl-9 pr-8 text-xs"
            />
            {keyword.length > 0 && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div>
            <label htmlFor="job-category-filter" className="sr-only">
              Filter kategori
            </label>
            <select
              id="job-category-filter"
              value={effectiveCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="craft-input text-xs"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="job-sort-select" className="sr-only">
              Urutkan lowongan
            </label>
            <select
              id="job-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as JobSortOption)}
              className="craft-input text-xs"
            >
              <option value="matchDesc">Match Tertinggi</option>
              <option value="matchAsc">Match Terendah</option>
              <option value="default">Urutan Bawaan</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11.5px] text-muted">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="inline-flex items-center gap-1.5">
              <img
                src={RETRO_ICONS.check}
                alt=""
                width={12}
                height={12}
                className="pixel-art"
              />
              Cocok dengan skill Kapten
            </span>
            <span className="inline-flex items-center gap-1.5">
              <img
                src={RETRO_ICONS.cross}
                alt=""
                width={11}
                height={11}
                className="pixel-art"
              />
              Missing skill
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-leaf-deep hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => setRetryCount((prev) => prev + 1)}
              disabled={isLoading}
              className="craft-btn py-1 px-3 text-[11.5px]"
            >
              <RefreshCw
                className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Muat Ulang
            </button>
          </div>
        </div>
      </div>

      {/* State 1: Loading */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="craft-card p-10 text-center space-y-3"
        >
          <Loader2
            className="w-7 h-7 text-leaf animate-spin mx-auto"
            aria-hidden="true"
          />
          <div>
            <p className="font-pixel font-bold text-lg text-ink">
              Mengambil data lowongan...
            </p>
            <p className="text-xs text-muted mt-1">
              Sumber:{" "}
              {dataSource === "live"
                ? "Remotive Live API"
                : "Dataset Magang ID (Lokal)"}
            </p>
          </div>
        </div>
      )}

      {/* State 2: Error */}
      {!isLoading && errorMessage && (
        <div
          role="alert"
          className="craft-card border-danger/45 bg-danger-soft/75 p-6 space-y-3.5"
        >
          <div className="flex items-center gap-2.5 text-danger">
            <img
              src={RETRO_ICONS.conflict}
              alt=""
              width={20}
              height={20}
              className="pixel-art"
            />
            <h3 className="font-pixel font-bold text-lg">
              Gagal Memuat Lowongan
            </h3>
          </div>
          <p className="text-xs font-semibold text-ink">{errorMessage}</p>
          <p className="text-xs text-muted leading-relaxed">
            Periksa koneksi internet Anda, klik <strong>Coba Lagi</strong>, atau
            beralih ke <strong>Dataset Fallback Lokal</strong> agar tetap bisa
            eksplorasi lowongan secara offline.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRetryCount((prev) => prev + 1)}
              className="craft-btn craft-btn-primary"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Coba Lagi
            </button>
            {dataSource === "live" && (
              <button
                type="button"
                onClick={() => onChangeDataSource("fallback")}
                className="craft-btn"
              >
                <img
                  src={RETRO_ICONS.folderOpen}
                  alt=""
                  width={14}
                  height={14}
                  className="pixel-art"
                />
                Gunakan Fallback Lokal
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 3: Empty */}
      {!isLoading && !errorMessage && enrichedJobs.length === 0 && (
        <div className="craft-card p-10 text-center space-y-3">
          <img
            src={RETRO_ICONS.search}
            alt=""
            width={32}
            height={32}
            className="pixel-art mx-auto opacity-85"
          />
          <div>
            <p className="font-pixel font-bold text-lg text-ink">
              Tidak ada lowongan yang cocok
            </p>
            <p className="text-xs text-muted mt-1">
              {hasActiveFilters
                ? "Coba ubah kata kunci pencarian atau pilih kategori lain."
                : "Daftar lowongan dari sumber data ini sedang kosong."}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="craft-btn"
            >
              Reset Pencarian &amp; Filter
            </button>
          )}
        </div>
      )}

      {/* Job Cards Grid */}
      {!isLoading && !errorMessage && enrichedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrichedJobs.map(
            ({ job, match, existingApplication }) => (
              <article
                key={`${dataSource}-${job.id}`}
                className="craft-card craft-card-hover p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Header: Company + Match Score Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        aria-hidden="true"
                        className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-cream to-leaf-soft text-leaf-deep font-pixel font-bold text-base flex items-center justify-center border border-line-strong/70"
                      >
                        {getCompanyInitials(job.company_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {job.company_name}
                        </p>
                        <p className="text-[11.5px] text-muted flex items-center gap-1 truncate mt-0.5">
                          <MapPin
                            className="w-3 h-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {job.candidate_required_location}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${MATCH_BADGE_STYLES[match.level]}`}
                    >
                      {match.score}% Match
                    </span>
                  </div>

                  {/* Role & Category (klik judul untuk buka Pop-up Detail) */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className="text-left font-pixel font-bold text-lg text-ink hover:text-leaf transition-colors leading-snug cursor-pointer"
                    >
                      {job.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="craft-eyebrow text-[10px]">{job.category}</p>
                      {existingApplication && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInWarRoom(existingApplication.id)
                          }
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-sky-soft text-sky-deep border border-sky hover:bg-leaf hover:text-white transition-colors cursor-pointer"
                          title="Buka lamaran ini di War Room"
                        >
                          Status: {STATUS_LABELS[existingApplication.status]}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Matched vs Missing Skills */}
                  {job.tags.length === 0 ? (
                    <p className="text-[11.5px] italic text-muted">
                      Tidak ada tag skill spesifik dari sumber lowongan.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {match.matchedSkills.map((skill) => (
                        <span
                          key={`matched-${skill}`}
                          title="Skill cocok dengan profil Kapten"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300"
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
                      {match.missingSkills.map((skill) => (
                        <span
                          key={`missing-${skill}`}
                          title="Missing skill - belum ada di profil Kapten"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full bg-danger-soft/75 text-danger border border-dashed border-danger/40"
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
                  )}
                </div>

                {/* Footer: Salary + Detail + Web Asli + Simpan */}
                <div className="pt-3.5 border-t border-line space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      {job.salary.trim().length > 0
                        ? job.salary
                        : "Gaji tidak dicantumkan"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className="craft-btn py-1 px-2.5 text-[11.5px]"
                        title="Lihat detail & cara melamar"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Detail
                      </button>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka halaman lowongan ${job.title}`}
                          className="craft-btn py-1 px-2.5 text-[11.5px]"
                          title="Buka halaman karir resmi"
                        >
                          <ExternalLink
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                    </div>
                  </div>

                  {existingApplication ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled
                        className="craft-btn w-full py-1.5 px-2.5 text-[11.5px]"
                      >
                        <BookmarkCheck
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">Sudah Dilamar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenInWarRoom(existingApplication.id)}
                        className="craft-btn craft-btn-primary w-full py-1.5 px-2.5 text-[11.5px]"
                      >
                        <span className="truncate">
                          {existingApplication.status === "WISHLIST"
                            ? "Lamar / Kelola"
                            : "Lihat di War Room"}
                        </span>
                        <ArrowRight
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveToWishlist(job)}
                        className="craft-btn w-full py-1.5 px-2.5 text-[11.5px]"
                      >
                        <BookmarkPlus
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">Simpan ke Wishlist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickApply(job)}
                        className="craft-btn craft-btn-primary w-full py-1.5 px-2.5 text-[11.5px]"
                      >
                        <Send
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">Catat Applied</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      )}

      {/* Pop-up Detail Lowongan */}
      <JobDetailModal
        job={selectedEntry?.job ?? null}
        match={selectedEntry?.match ?? null}
        existingApplication={selectedEntry?.existingApplication ?? null}
        onClose={() => setSelectedJobId(null)}
        onSaveToWishlist={onSaveToWishlist}
        onQuickApply={onQuickApply}
        onOpenInWarRoom={onOpenInWarRoom}
      />
    </section>
  );
}
