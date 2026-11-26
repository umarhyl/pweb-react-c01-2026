import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { RETRO_ICONS } from "./assets/retro";
import {
  ApplicationDetailModal,
  ApplicationFormModal,
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

const STORAGE_KEYS = {
  APPLICATIONS: "aku-mw-magang:applications",
  SKILLS: "aku-mw-magang:kapten-skills",
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
  const [dataSource, setDataSource] = useState<JobDataSource>("live");
  const [activeTab, setActiveTab] = useState<ActiveTab>("explorer");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
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
    <div className="min-h-screen px-2 sm:px-6 pt-4 sm:pt-7 pb-20">
      <div className="xp-desktop max-w-[1140px] mx-auto overflow-hidden">
        {/* Sticky XP Window Titlebar + Classic Menu Bar */}
        <header className="sticky top-0 z-30">
          <div className="xp-titlebar">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={RETRO_ICONS.briefcase}
                alt=""
                width={16}
                height={16}
                className="xp-pixel shrink-0"
              />
              <span className="truncate">Aku Mw Magang - Kapten&apos;s War Room</span>
            </div>
            <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
              <span className="xp-win-ctrl">_</span>
              <span className="xp-win-ctrl">□</span>
              <span className="xp-win-ctrl xp-win-ctrl-close">X</span>
            </div>
          </div>

          <nav
            aria-label="Navigasi utama"
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-xp-cream border-b border-xp-cream-border"
          >
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("explorer")}
                aria-current={activeTab === "explorer" ? "page" : undefined}
                className={`px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "explorer"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <img
                  src={RETRO_ICONS.briefcase}
                  alt=""
                  width={14}
                  height={14}
                  className="xp-pixel"
                />
                Eksplorasi Lowongan
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                aria-current={activeTab === "pipeline" ? "page" : undefined}
                className={`px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "pipeline"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <img
                  src={RETRO_ICONS.pipeline}
                  alt=""
                  width={14}
                  height={14}
                  className="xp-pixel"
                />
                Pipeline Lamaran ({applications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("comparator")}
                aria-current={activeTab === "comparator" ? "page" : undefined}
                className={`px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "comparator"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <img
                  src={RETRO_ICONS.comparator}
                  alt=""
                  width={14}
                  height={14}
                  className="xp-pixel"
                />
                Bandingkan Offer ({offerCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportBackup}
                title="Export backup lamaran dan skill ke file JSON"
                className="xp-btn py-1 px-2.5 text-[11px]"
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                Export JSON
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                title="Import backup dari file JSON"
                className="xp-btn py-1 px-2.5 text-[11px]"
              >
                <Upload className="w-3 h-3" aria-hidden="true" />
                Import JSON
              </button>

              <button
                type="button"
                onClick={handleResetAllData}
                title="Reset seluruh lamaran & skill ke kondisi awal"
                className="xp-btn py-1 px-2.5 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
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
                onClick={() => setIsFormModalOpen(true)}
                className="xp-btn xp-btn-green py-1.5 px-3.5"
              >
                <img
                  src={RETRO_ICONS.plus}
                  alt=""
                  width={13}
                  height={13}
                  className="xp-pixel brightness-200"
                />
                Catat Lamaran
              </button>
            </div>
          </nav>
        </header>

        {/* Retro98 / Modul-1 Blueprint Grid Hero Header */}
        <section className="xp-grid-bg border-b border-xp-ink px-5 sm:px-8 py-6 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="xp-eyebrow text-xp-deep/80">
                WELCOME TO KAPTEN&apos;S WAR ROOM &middot; INTERNSHIP TRACKER 2026
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-xp-deep tracking-tight leading-tight">
                Aku Mw <mark className="xp-highlight">Magang!</mark>
              </h1>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {TAB_SUBTITLE[activeTab]}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(true)}
                className="xp-btn xp-btn-green px-4 py-2 text-xs"
              >
                <img
                  src={RETRO_ICONS.plus}
                  alt=""
                  width={14}
                  height={14}
                  className="xp-pixel brightness-200"
                />
                + Catat Lamaran Manual
              </button>
            </div>
          </div>
        </section>

        {/* Airy Editorial Paper Workspace */}
        <main className="px-5 sm:px-8 py-6 sm:py-8 space-y-7 bg-xp-paper">
          {backupNotice && (
            <div
              role="status"
              className={`p-3 border text-xs font-bold flex items-center justify-between gap-3 ${
                backupNotice.type === "success"
                  ? "bg-emerald-50 border-xp-green text-emerald-950"
                  : "bg-red-50 border-xp-danger text-red-900"
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
              onOpenCreateModal={() => setIsFormModalOpen(true)}
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
      </div>

      {/* Modal Fitur 2: Form Tambah Lamaran Manual */}
      <ApplicationFormModal
        isOpen={isFormModalOpen}
        applications={applications}
        onClose={() => setIsFormModalOpen(false)}
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

      {/* Windows XP Bottom Taskbar */}
      <footer className="xp-taskbar fixed bottom-0 left-0 right-0 z-40">
        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          className="xp-start"
        >
          <img
            src={RETRO_ICONS.startLogo}
            alt=""
            width={20}
            height={20}
            className="rounded-xs object-contain"
          />
          <span>start</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("explorer")}
            className={`xp-task ${activeTab === "explorer" ? "xp-task-active" : ""}`}
          >
            <img
              src={RETRO_ICONS.briefcase}
              alt=""
              width={15}
              height={15}
              className="xp-pixel"
            />
            <span className="hidden sm:inline">Eksplorasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`xp-task ${activeTab === "pipeline" ? "xp-task-active" : ""}`}
          >
            <img
              src={RETRO_ICONS.pipeline}
              alt=""
              width={15}
              height={15}
              className="xp-pixel"
            />
            <span className="hidden sm:inline">Pipeline</span> (
            {applications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comparator")}
            className={`xp-task ${activeTab === "comparator" ? "xp-task-active" : ""}`}
          >
            <img
              src={RETRO_ICONS.comparator}
              alt=""
              width={15}
              height={15}
              className="xp-pixel"
            />
            <span className="hidden sm:inline">Offer</span> ({offerCount})
          </button>
        </div>

        <div className="xp-tray hidden sm:flex">
          <img
            src={RETRO_ICONS.sleepingCat}
            alt=""
            width={22}
            height={16}
            className="xp-pixel"
          />
          <img
            src={RETRO_ICONS.speaker}
            alt=""
            width={14}
            height={14}
            className="xp-pixel"
          />
          <span>Praktikum Pemrograman Website - 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
