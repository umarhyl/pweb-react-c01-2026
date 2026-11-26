import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  Building2,
  Check,
  Database,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useDebounce } from "../hooks";
import { fetchJobs, isAbortError } from "../services";
import type { Application, JobDataSource, JobListing } from "../types";
import {
  calculateSkillMatch,
  isDuplicateApplication,
} from "../utils";
import type { MatchLevel } from "../utils";

type JobSortOption = "matchDesc" | "matchAsc" | "default";

interface JobExplorerProps {
  kaptenSkills: readonly string[];
  applications: readonly Application[];
  dataSource: JobDataSource;
  onChangeDataSource: (source: JobDataSource) => void;
  onSaveToWishlist: (job: JobListing) => void;
}

const MATCH_BADGE_STYLES: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-700",
  medium: "bg-amber-100 text-amber-950 border-amber-600",
  low: "bg-red-100 text-red-900 border-red-700",
};

const MATCH_DOT_STYLES: Readonly<Record<MatchLevel, string>> = {
  high: "bg-emerald-600",
  medium: "bg-amber-500",
  low: "bg-red-600",
};

function getCompanyInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function JobExplorer({
  kaptenSkills,
  applications,
  dataSource,
  onChangeDataSource,
  onSaveToWishlist,
}: JobExplorerProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<JobSortOption>("matchDesc");

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

      if (isEditable) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
      .map((job) => ({
        job,
        match: calculateSkillMatch(kaptenSkills, job.tags),
        alreadyApplied: isDuplicateApplication(
          applications,
          job.company_name,
          job.title,
        ),
      }));

    if (sortBy === "matchDesc") {
      return [...matchedList].sort((a, b) => b.match.score - a.match.score);
    }

    if (sortBy === "matchAsc") {
      return [...matchedList].sort((a, b) => a.match.score - b.match.score);
    }

    return matchedList;
  }, [jobs, effectiveCategory, debouncedKeyword, kaptenSkills, applications, sortBy]);

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
      {/* Toolbar Search, Filter & Sort */}
      <div className="xp-window p-3 space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_170px] gap-2">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
              className="xp-input pl-8 pr-8 text-xs"
            />
            {keyword.length > 0 && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-xp-ink cursor-pointer"
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
              className="xp-input text-xs"
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
              className="xp-input text-xs"
            >
              <option value="matchDesc">Match Tertinggi</option>
              <option value="matchAsc">Match Terendah</option>
              <option value="default">Urutan Bawaan</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{" "}
              <strong className="font-mono text-xp-deep">
                {enrichedJobs.length}
              </strong>{" "}
              dari{" "}
              <strong className="font-mono">{jobs.length}</strong> lowongan (
              {dataSource === "live" ? "Remotive Live" : "Dataset Lokal"})
            </span>
            {isDebouncing && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-xp-soft border border-xp-border text-xp-deep">
                menyaring...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="underline text-xp-deep hover:text-xp-bar font-bold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => setRetryCount((prev) => prev + 1)}
              disabled={isLoading}
              className="xp-btn px-2 py-1 text-[11px]"
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
          className="xp-paper p-8 text-center space-y-3"
        >
          <Loader2
            className="w-7 h-7 text-xp-bar animate-spin mx-auto"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-sm text-xp-deep">
              Mengambil data lowongan...
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
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
          className="xp-window border-xp-danger bg-red-50/90"
        >
          <div className="px-3 py-1.5 bg-xp-danger text-white text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Gagal Memuat Lowongan
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm font-bold text-red-950">{errorMessage}</p>
            <p className="text-xs text-red-900">
              Periksa koneksi internet Anda, klik <strong>Coba Lagi</strong>,
              atau beralih ke <strong>Dataset Fallback Lokal</strong> agar tetap
              bisa eksplorasi lowongan.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRetryCount((prev) => prev + 1)}
                className="xp-btn xp-btn-green"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Coba Lagi
              </button>
              {dataSource === "live" && (
                <button
                  type="button"
                  onClick={() => onChangeDataSource("fallback")}
                  className="xp-btn"
                >
                  <Database className="w-3.5 h-3.5" aria-hidden="true" />
                  Gunakan Fallback Lokal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State 3: Empty */}
      {!isLoading && !errorMessage && enrichedJobs.length === 0 && (
        <div className="xp-paper p-8 text-center space-y-3">
          <Building2
            className="w-8 h-8 text-xp-border mx-auto"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-sm text-xp-deep">
              Tidak ada lowongan yang cocok
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {hasActiveFilters
                ? "Coba ubah kata kunci pencarian atau pilih kategori lain."
                : "Daftar lowongan dari sumber data ini sedang kosong."}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="xp-btn"
            >
              Reset Pencarian &amp; Filter
            </button>
          )}
        </div>
      )}

      {/* Job Cards Grid */}
      {!isLoading && !errorMessage && enrichedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {enrichedJobs.map(({ job, match, alreadyApplied }) => (
            <article
              key={`${dataSource}-${job.id}`}
              className="xp-paper p-4 flex flex-col justify-between gap-3 hover:bg-xp-soft/20 transition-colors"
            >
              <div className="space-y-2.5">
                {/* Header: Company + Match Score Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      aria-hidden="true"
                      className="w-9 h-9 shrink-0 bg-xp-deep text-white font-mono font-bold text-xs flex items-center justify-center border border-xp-ink"
                    >
                      {getCompanyInitials(job.company_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-xp-ink truncate">
                        {job.company_name}
                      </p>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {job.candidate_required_location}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-bold border ${MATCH_BADGE_STYLES[match.level]}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full ${MATCH_DOT_STYLES[match.level]}`}
                    />
                    {match.score}% Match
                  </span>
                </div>

                {/* Role & Category */}
                <div>
                  <h3 className="font-display font-bold text-base text-xp-deep leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                    {job.category}
                  </p>
                </div>

                {/* Matched vs Missing Skills */}
                <div className="space-y-1.5">
                  {job.tags.length === 0 ? (
                    <p className="text-[11px] italic text-slate-500">
                      Tidak ada tag skill spesifik dari sumber lowongan.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {match.matchedSkills.map((skill) => (
                        <span
                          key={`matched-${skill}`}
                          title="Skill cocok dengan profil Kapten"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-600"
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />
                          {skill}
                        </span>
                      ))}
                      {match.missingSkills.map((skill) => (
                        <span
                          key={`missing-${skill}`}
                          title="Missing skill — belum ada di profil Kapten"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-red-50 text-red-800 border border-dashed border-red-400"
                        >
                          <span aria-hidden="true" className="font-mono text-[10px]">
                            !
                          </span>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {match.missingSkills.length > 0 && (
                    <p className="text-[11px] text-red-800">
                      Missing ({match.missingSkills.length}):{" "}
                      <span className="font-bold">
                        {match.missingSkills.join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Footer: Salary + Actions */}
              <div className="pt-2.5 border-t border-xp-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono font-bold text-xp-ink flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-xp-deep" aria-hidden="true" />
                  <span>
                    {job.salary.trim().length > 0
                      ? job.salary
                      : "Gaji tidak dicantumkan"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka halaman lowongan ${job.title}`}
                      className="xp-btn px-2 py-1.5"
                      title="Buka link lowongan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={alreadyApplied}
                    onClick={() => onSaveToWishlist(job)}
                    className={`xp-btn ${
                      alreadyApplied ? "bg-xp-cream text-slate-600" : "xp-btn-green"
                    }`}
                  >
                    {alreadyApplied ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Sudah Dilamar
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        Simpan ke Wishlist
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
