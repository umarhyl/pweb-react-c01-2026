import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowRight, ArrowUpRight, Database, Moon, Sun, X } from "lucide-react";
import { RETRO_ICONS } from "./assets/retro";
import {
  ApplicationDetailModal,
  ApplicationFormModal,
  BackupDataModal,
  ConflictBanner,
  JobExplorer,
  OfferComparator,
  SkillProfile,
  StatsDashboard,
  UndoToast,
  WarRoomPipeline,
} from "./components";
import type { ManualApplicationInput } from "./components";
import { useLocalStorage, useUndoDelete } from "./hooks";
import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  ChecklistItem,
  JobDataSource,
  JobListing,
  StatusTransitionPayload,
  WorkMode,
} from "./types";
import {
  STATUS_LABELS,
  createBackupJson,
  findInterviewConflicts,
  getConflictingApplicationIds,
  hasDuplicateSkill,
  isDuplicateApplication,
  parseBackupJson,
} from "./utils";

type ActiveTab = "explorer" | "pipeline" | "comparator";
type ThemeMode = "light" | "dark";

const STORAGE_KEYS = {
  APPLICATIONS: "aku-mw-magang:applications",
  SKILLS: "aku-mw-magang:kapten-skills",
  THEME: "aku-mw-magang:theme",
} as const;

const DEFAULT_KAPTEN_SKILLS: string[] = [
  "React",
  "TypeScript",
  "CSS",
  "Git",
  "REST API",
];

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

const TAB_SUBTITLE: Readonly<Record<ActiveTab, string>> = {
  explorer:
    "Eksplorasi lowongan magang tech, pantau kecocokan skill Kapten secara live, dan simpan target ke Wishlist.",
  pipeline:
    "Pantau alur lamaran dengan state machine ketat, checklist persiapan, deteksi ghosting, dan jadwal interview.",
  comparator:
    "Bandingkan dua tawaran magang secara objektif berdasarkan uang saku, mode kerja, dan kecocokan skill.",
};

function inferWorkMode(location: string): WorkMode {
  const normalized = location.toLowerCase();
  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("onsite") || normalized.includes("on-site")) {
    return "Onsite";
  }
  return "Remote";
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createLog(
  message: string,
  timestamp = new Date().toISOString(),
): ActivityLog {
  return {
    id: createId(),
    timestamp,
    message,
  };
}

function buildTransitionLogMessage(
  from: ApplicationStatus,
  to: ApplicationStatus,
  payload: StatusTransitionPayload,
): string {
  const base = `Status pindah dari ${STATUS_LABELS[from]} ke ${STATUS_LABELS[to]}`;

  if (to === "APPLIED" && payload.cvVersion) {
    return `${base} (CV: ${payload.cvVersion}, Tanggal: ${payload.appliedDate ?? "-"})`;
  }
  if (to === "INTERVIEW" && payload.interviewDateTime) {
    return `${base} (Jadwal: ${payload.interviewDateTime})`;
  }
  if (to === "OFFER" && payload.salaryOffer) {
    const formatted = new Intl.NumberFormat("id-ID").format(payload.salaryOffer);
    return `${base} (Offer: Rp ${formatted}, Mode: ${payload.workMode ?? "-"})`;
  }
  return base;
}

export function App() {
  const [applications, setApplications] = useLocalStorage<Application[]>(
    STORAGE_KEYS.APPLICATIONS,
    [],
  );
  const [kaptenSkills, setKaptenSkills] = useLocalStorage<string[]>(
    STORAGE_KEYS.SKILLS,
    DEFAULT_KAPTEN_SKILLS,
  );
  const [theme, setTheme] = useLocalStorage<ThemeMode>(
    STORAGE_KEYS.THEME,
    "light",
  );

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const [dataSource, setDataSource] = useState<JobDataSource>("live");
  const [activeTab, setActiveTab] = useState<ActiveTab>("explorer");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [formPrefill, setFormPrefill] =
    useState<Partial<ManualApplicationInput> | null>(null);
  const [formModalKey, setFormModalKey] = useState(0);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [backupNotice, setBackupNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const {
    pendingDeleted,
    secondsRemaining,
    scheduleUndo,
    triggerUndo,
    dismissUndo,
  } = useUndoDelete(5000);

  const offerCount = applications.filter((app) => app.status === "OFFER").length;

  const conflicts = useMemo(
    () => findInterviewConflicts(applications),
    [applications],
  );

  const conflictingIds = useMemo(
    () => getConflictingApplicationIds(applications),
    [applications],
  );

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );

  const handleAddSkill = (skill: string) => {
    setKaptenSkills((prev) => {
      if (hasDuplicateSkill(prev, skill)) return prev;
      return [...prev, skill.trim()];
    });
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setKaptenSkills((prev) =>
      prev.filter(
        (skill) => skill.toLowerCase() !== skillToRemove.toLowerCase(),
      ),
    );
  };

  const handleSaveToWishlist = (job: JobListing) => {
    setApplications((prev) => {
      if (isDuplicateApplication(prev, job.company_name, job.title)) {
        return prev;
      }

      const now = new Date().toISOString();
      const newApplication: Application = {
        id: createId(),
        company: job.company_name.trim(),
        role: job.title.trim(),
        workMode: inferWorkMode(job.candidate_required_location),
        status: "WISHLIST",
        requiredSkills: job.tags,
        ...(job.url ? { jobUrl: job.url } : {}),
        lastUpdatedAt: now,
        checklist: [],
        activityLogs: [
          createLog("Disimpan ke Wishlist dari Eksplorasi Lowongan.", now),
        ],
      };

      return [newApplication, ...prev];
    });
  };

  const handleAddManualApplication = (input: ManualApplicationInput) => {
    setApplications((prev) => {
      if (isDuplicateApplication(prev, input.company, input.role)) {
        return prev;
      }

      const now = new Date().toISOString();
      const logMessage =
        input.status === "APPLIED"
          ? `Lamaran dikirim manual (CV: ${input.cvVersion}, tanggal: ${input.appliedDate}).`
          : "Lamaran ditambahkan manual ke Wishlist.";

      const newApplication: Application = {
        id: createId(),
        company: input.company,
        role: input.role,
        workMode: input.workMode,
        status: input.status,
        requiredSkills: input.requiredSkills,
        ...(input.jobUrl ? { jobUrl: input.jobUrl } : {}),
        ...(input.status === "APPLIED"
          ? {
              cvVersion: input.cvVersion,
              cvAttachment: input.cvAttachment,
              appliedDate: input.appliedDate,
            }
          : {}),
        lastUpdatedAt: now,
        checklist: [],
        activityLogs: [createLog(logMessage, now)],
      };

      return [newApplication, ...prev];
    });
  };

  const handleTransitionStatus = (
    applicationId: string,
    nextStatus: ApplicationStatus,
    payload: StatusTransitionPayload,
  ) => {
    const nowIso = new Date().toISOString();

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;

        const nextLog = createLog(
          buildTransitionLogMessage(app.status, nextStatus, payload),
          nowIso,
        );

        return {
          ...app,
          status: nextStatus,
          cvVersion: payload.cvVersion ?? app.cvVersion,
          cvAttachment: payload.cvAttachment ?? app.cvAttachment,
          appliedDate: payload.appliedDate ?? app.appliedDate,
          interviewDateTime: payload.interviewDateTime ?? app.interviewDateTime,
          salaryOffer: payload.salaryOffer ?? app.salaryOffer,
          workMode: payload.workMode ?? app.workMode,
          lastUpdatedAt: nowIso,
          activityLogs: [nextLog, ...app.activityLogs],
        };
      }),
    );
  };

  const handleAddChecklistItem = (applicationId: string, text: string) => {
    const newItem: ChecklistItem = {
      id: createId(),
      text,
      done: false,
    };

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, checklist: [...app.checklist, newItem] }
          : app,
      ),
    );
  };

  const handleToggleChecklistItem = (applicationId: string, itemId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              checklist: app.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
            }
          : app,
      ),
    );
  };

  const handleDeleteChecklistItem = (applicationId: string, itemId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              checklist: app.checklist.filter((item) => item.id !== itemId),
            }
          : app,
      ),
    );
  };

  const handleAddActivityNote = (applicationId: string, message: string) => {
    const noteLog = createLog(`Catatan Kapten: ${message}`);

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, activityLogs: [noteLog, ...app.activityLogs] }
          : app,
      ),
    );
  };

  const handleSimulateGhosting = (applicationId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        if (app.status !== "APPLIED" && app.status !== "SCREENING") return app;

        const baseMs = Date.parse(app.lastUpdatedAt) || Date.now();
        const shiftedIso = new Date(baseMs - FIFTEEN_DAYS_MS).toISOString();
        const simLog = createLog(
          "Simulasi +15 Hari dijalankan (lastUpdatedAt dimundurkan 15 hari).",
        );

        return {
          ...app,
          lastUpdatedAt: shiftedIso,
          activityLogs: [simLog, ...app.activityLogs],
        };
      }),
    );
  };

  const handleDeleteApplication = (applicationId: string) => {
    const target = applications.find((app) => app.id === applicationId);
    if (!target) return;

    setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    if (selectedApplicationId === applicationId) {
      setSelectedApplicationId(null);
    }
    scheduleUndo(target);
  };

  const handleUndoDelete = () => {
    const restored = triggerUndo();
    if (!restored) return;

    setApplications((prev) => {
      if (
        prev.some((app) => app.id === restored.id) ||
        isDuplicateApplication(prev, restored.company, restored.role)
      ) {
        return prev;
      }
      return [restored, ...prev];
    });
  };

  const handleSelectConflictApplication = (applicationId: string) => {
    setActiveTab("pipeline");
    setSelectedApplicationId(applicationId);
  };

  const handleOpenManualForm = () => {
    setFormPrefill(null);
    setFormModalKey((prev) => prev + 1);
    setIsFormModalOpen(true);
  };

  const handleQuickApplyFromJob = (job: JobListing) => {
    setFormPrefill({
      company: job.company_name.trim(),
      role: job.title.trim(),
      workMode: inferWorkMode(job.candidate_required_location),
      status: "APPLIED",
      requiredSkills: job.tags,
      jobUrl: job.url,
    });
    setFormModalKey((prev) => prev + 1);
    setIsFormModalOpen(true);
  };

  // Bonus: Export backup JSON
  const handleExportBackup = () => {
    const json = createBackupJson(applications, kaptenSkills);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aku-mw-magang-backup-${dateStamp}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setBackupNotice({
      type: "success",
      text: `Backup berhasil diunduh (${applications.length} lamaran, ${kaptenSkills.length} skill).`,
    });
  };

  // Bonus: Import backup JSON dengan validasi skema ketat
  const handleImportBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseBackupJson(content);

      if (!parsed.ok) {
        setBackupNotice({ type: "error", text: parsed.error });
        return;
      }

      dismissUndo();
      setSelectedApplicationId(null);
      setApplications(parsed.data.applications);
      setKaptenSkills(parsed.data.kaptenSkills);
      setBackupNotice({
        type: "success",
        text: `Backup berhasil dipulihkan (${parsed.data.applications.length} lamaran, ${parsed.data.kaptenSkills.length} skill).`,
      });
    };
    reader.onerror = () => {
      setBackupNotice({
        type: "error",
        text: "Gagal membaca file backup JSON.",
      });
    };
    reader.readAsText(file);
  };

  // Reset seluruh data localStorage aplikasi
  const handleResetAllData = () => {
    const confirmed = window.confirm(
      "Reset seluruh lamaran dan kembalikan profil skill Kapten ke default?",
    );
    if (!confirmed) return;

    dismissUndo();
    setSelectedApplicationId(null);
    setApplications([]);
    setKaptenSkills(DEFAULT_KAPTEN_SKILLS);
    setBackupNotice({
      type: "success",
      text: "Data berhasil di-reset ke kondisi awal.",
    });
  };

  return (
    <div className="h-screen overflow-hidden px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col">
      <div className="craft-sheet w-full max-w-[1160px] mx-auto flex-1 min-h-0 flex flex-col">
        {/* Pinned Combined Header: Retro '98 Mini-Strip + Main Navbar (Always On Top & Rounded) */}
        <header className="shrink-0 z-30 shadow-[0_6px_18px_rgb(15_44_95/0.08)]">
          <div className="craft-topbar-98">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={RETRO_ICONS.briefcase}
                alt=""
                width={14}
                height={14}
                className="pixel-art shrink-0"
              />
              <span className="truncate">
                AkuMwMagang.exe - Kapten&apos;s War Room
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
              <span className="craft-win-dot">_</span>
              <span className="craft-win-dot">□</span>
              <span className="craft-win-dot">×</span>
            </div>
          </div>

          <div className="bg-paper/95 backdrop-blur-md border-b border-line px-5 sm:px-8 py-3">
            <nav
              aria-label="Navigasi utama"
              className="flex flex-wrap items-center justify-between gap-3"
            >
            {/* Brand */}
            <button
              type="button"
              onClick={() => setActiveTab("explorer")}
              className="inline-flex items-center gap-2.5 cursor-pointer group"
            >
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-leaf-soft to-cream border border-line-strong flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <img
                  src={RETRO_ICONS.home}
                  alt=""
                  width={18}
                  height={18}
                  className="pixel-art"
                />
              </span>
              <span className="font-pixel text-lg font-bold text-ink tracking-tight">
                Aku Mw <span className="text-leaf-deep">Magang</span>
              </span>
            </button>

            {/* Center Segmented Pill Tabs */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-cream-soft border border-line">
              <button
                type="button"
                onClick={() => setActiveTab("explorer")}
                aria-current={activeTab === "explorer" ? "page" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "explorer"
                    ? "bg-surface text-leaf-deep shadow-xs border border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                <img
                  src={RETRO_ICONS.briefcase}
                  alt=""
                  width={14}
                  height={14}
                  className="pixel-art"
                />
                Eksplorasi
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                aria-current={activeTab === "pipeline" ? "page" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "pipeline"
                    ? "bg-surface text-leaf-deep shadow-xs border border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                <img
                  src={RETRO_ICONS.pipeline}
                  alt=""
                  width={14}
                  height={14}
                  className="pixel-art"
                />
                War Room ({applications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("comparator")}
                aria-current={activeTab === "comparator" ? "page" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "comparator"
                    ? "bg-surface text-leaf-deep shadow-xs border border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                <img
                  src={RETRO_ICONS.comparator}
                  alt=""
                  width={14}
                  height={14}
                  className="pixel-art"
                />
                Offer ({offerCount})
              </button>
            </div>

            {/* Right Utilities + Primary Pill CTA */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={
                  theme === "dark"
                    ? "Ganti ke mode terang"
                    : "Ganti ke mode gelap"
                }
                title={
                  theme === "dark"
                    ? "Ganti ke Mode Terang"
                    : "Ganti ke Mode Gelap"
                }
                className="craft-btn py-1.5 px-3 text-xs"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-warn" aria-hidden="true" />
                    Terang
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-leaf" aria-hidden="true" />
                    Gelap
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsBackupModalOpen(true)}
                title="Simpan cadangan, pulihkan, atau reset data lamaran & skill"
                className="craft-btn py-1.5 px-3 text-xs"
              >
                <Database className="w-3.5 h-3.5 text-leaf" aria-hidden="true" />
                Backup Data
              </button>

              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackup}
                className="hidden"
                aria-label="Import file backup JSON"
              />

              <button
                type="button"
                onClick={handleOpenManualForm}
                className="craft-btn craft-btn-primary py-1.5 px-4 text-xs"
              >
                Catat Lamaran
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            </nav>
          </div>
        </header>

        {/* Scrollable Inner Window Viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto craft-scroll">
        {/* Blockfolio-style Scenic Voxel Hero with Image-Tinted Shadow & Curved Wave */}
        <section className="relative overflow-hidden">
          <div className="craft-hero px-6 sm:px-10 pt-8 sm:pt-10 pb-14 sm:pb-16 flex items-center">
            <div className="relative z-10 max-w-lg space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Kapten&apos;s Internship Tracker &middot; Modul 5
              </p>

              <h1 className="font-pixel text-4xl sm:text-[46px] font-bold tracking-tight leading-[1.03] text-ink">
                <span className="block">Lamar,</span>
                <span className="block">Pantau,</span>
                <span className="inline-flex items-center gap-2 text-leaf">
                  Dapat Magang!
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    shapeRendering="crispEdges"
                    className="shrink-0 -mt-3 text-leaf"
                  >
                    <rect x="7" y="1" width="2" height="4" fill="currentColor" />
                    <rect x="7" y="11" width="2" height="4" fill="currentColor" />
                    <rect x="1" y="7" width="4" height="2" fill="currentColor" />
                    <rect x="11" y="7" width="4" height="2" fill="currentColor" />
                    <rect x="6" y="6" width="4" height="4" fill="#59acff" />
                  </svg>
                </span>
              </h1>

              <p className="text-xs sm:text-[13.5px] text-ink/80 leading-relaxed max-w-md">
                {TAB_SUBTITLE[activeTab]}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {activeTab === "explorer" ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("pipeline")}
                    className="craft-btn craft-btn-primary py-2 px-5 text-xs"
                  >
                    Buka War Room
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("explorer")}
                    className="craft-btn craft-btn-primary py-2 px-5 text-xs"
                  >
                    Jelajahi Lowongan
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}

                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/85 backdrop-blur-xs border border-line text-xs text-ink shadow-xs">
                  <img
                    src={RETRO_ICONS.sleepingCat}
                    alt=""
                    width={22}
                    height={15}
                    className="pixel-art"
                  />
                  <span>
                    Tekan{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-cream-soft border border-line-strong font-mono text-[10px] font-semibold">
                      /
                    </kbd>{" "}
                    cari cepat
                  </span>
                </span>
              </div>
            </div>

            {/* Smooth Curved Wave Slicing into Paper Workspace */}
            <svg
              aria-hidden="true"
              viewBox="0 0 1200 54"
              preserveAspectRatio="none"
              className="absolute bottom-0 left-0 w-full h-9 sm:h-11 text-paper fill-current pointer-events-none z-10"
            >
              <path d="M0,34 C340,62 840,-10 1200,28 L1200,54 L0,54 Z" />
            </svg>
          </div>

          {/* Ambient Image-Backed Shadow Layer */}
          <div className="craft-hero-img-shadow" aria-hidden="true" />
        </section>

        {/* Main Workspace (relative z-10 & transparent so bottom voxel horizon peeks softly behind last cards) */}
        <main className="relative z-10 px-5 sm:px-8 pt-3 pb-10 space-y-6">
          {backupNotice && (
            <div
              role="status"
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
                backupNotice.type === "success"
                  ? "bg-leaf-soft border-leaf/45 text-leaf-deep"
                  : "bg-danger-soft border-danger/45 text-danger"
              }`}
            >
              <span>{backupNotice.text}</span>
              <button
                type="button"
                onClick={() => setBackupNotice(null)}
                aria-label="Tutup notifikasi backup"
                className="p-0.5 hover:opacity-70 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Banner Bentrok Global: selalu tampil dari seluruh data meski tab/filter lain aktif */}
          <ConflictBanner
            conflicts={conflicts}
            onSelectApplication={handleSelectConflictApplication}
          />

          {/* Fitur 7: 5 Kartu Statistik (Derived State) */}
          <StatsDashboard applications={applications} />

          {activeTab === "explorer" && (
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
              <SkillProfile
                skills={kaptenSkills}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                dataSource={dataSource}
                onChangeDataSource={setDataSource}
              />
              <JobExplorer
                kaptenSkills={kaptenSkills}
                applications={applications}
                dataSource={dataSource}
                onChangeDataSource={setDataSource}
                onSaveToWishlist={handleSaveToWishlist}
                onQuickApply={handleQuickApplyFromJob}
                onOpenInWarRoom={handleSelectConflictApplication}
              />
            </div>
          )}

          {activeTab === "pipeline" && (
            <WarRoomPipeline
              applications={applications}
              userSkills={kaptenSkills}
              onSelectApplication={setSelectedApplicationId}
              onSimulateGhosting={handleSimulateGhosting}
              onDeleteApplication={handleDeleteApplication}
              onOpenCreateModal={handleOpenManualForm}
              showConflictBanner={false}
            />
          )}

          {activeTab === "comparator" && (
            <OfferComparator
              applications={applications}
              userSkills={kaptenSkills}
              onOpenPipeline={() => setActiveTab("pipeline")}
            />
          )}
        </main>

        {/* Panoramic Voxel Mountains & Tech Campus Footer Banner */}
        <section
          aria-label="Semangat Magang Kapten"
          className="craft-footer-horizon px-6 sm:px-10 pb-8 flex items-end"
        >
          <div className="max-w-xs sm:max-w-sm space-y-1.5">
            <span
              aria-hidden="true"
              className="block font-pixel text-4xl leading-none text-leaf"
            >
              &ldquo;
            </span>
            <p className="font-pixel text-lg sm:text-xl font-bold text-ink leading-snug">
              Satu lamaran rapi hari ini, satu langkah menuju offer pertamamu.
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted pt-0.5">
              Kapten&apos;s Career Horizon
            </p>
          </div>
        </section>

        {/* Subtle Retro '98 Status Footer Strip (Inside the sheet, no clutter) */}
        <footer className="px-5 sm:px-8 py-3 bg-cream-soft/90 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
          <div className="inline-flex items-center gap-2 font-os">
            <img
              src={RETRO_ICONS.sleepingCat}
              alt=""
              width={22}
              height={15}
              className="pixel-art"
            />
            <span>
              {applications.length} lamaran tersimpan &middot;{" "}
              {kaptenSkills.length} skill aktif
            </span>
          </div>
          <span className="font-os">
            Aku Mw Magang &middot; Praktikum Pemweb 2026
          </span>
        </footer>
        </div>
      </div>

      {/* Modal Fitur Bonus: Backup & Kelola Data Lokal */}
      <BackupDataModal
        isOpen={isBackupModalOpen}
        applicationsCount={applications.length}
        skillsCount={kaptenSkills.length}
        onClose={() => setIsBackupModalOpen(false)}
        onExportBackup={handleExportBackup}
        onTriggerImport={() => importInputRef.current?.click()}
        onResetAllData={handleResetAllData}
      />

      {/* Modal Fitur 2: Form Tambah Lamaran Manual */}
      <ApplicationFormModal
        key={formModalKey}
        isOpen={isFormModalOpen}
        applications={applications}
        initialData={formPrefill}
        onClose={() => {
          setIsFormModalOpen(false);
          setFormPrefill(null);
        }}
        onSubmit={handleAddManualApplication}
      />

      {/* Modal Fitur 4 & 5: Detail Lamaran & Interview Prep Timer */}
      {selectedApplication && (
        <ApplicationDetailModal
          key={selectedApplication.id}
          application={selectedApplication}
          userSkills={kaptenSkills}
          hasConflict={conflictingIds.has(selectedApplication.id)}
          onClose={() => setSelectedApplicationId(null)}
          onTransitionStatus={handleTransitionStatus}
          onAddChecklistItem={handleAddChecklistItem}
          onToggleChecklistItem={handleToggleChecklistItem}
          onDeleteChecklistItem={handleDeleteChecklistItem}
          onAddActivityNote={handleAddActivityNote}
          onSimulateGhosting={handleSimulateGhosting}
          onDeleteApplication={handleDeleteApplication}
        />
      )}

      {/* Toast Fitur 6: Undo Delete 5 Detik */}
      <UndoToast
        deletedApplication={pendingDeleted}
        secondsRemaining={secondsRemaining}
        onUndo={handleUndoDelete}
        onDismiss={dismissUndo}
      />
    </div>
  );
}

export default App;
