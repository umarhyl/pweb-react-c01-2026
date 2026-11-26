import { useMemo, useState } from "react";
import { Briefcase, Compass, LayoutList, Plus, Scale } from "lucide-react";
import {
  ApplicationDetailModal,
  ApplicationFormModal,
  ConflictBanner,
  JobExplorer,
  SkillProfile,
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
  findInterviewConflicts,
  getConflictingApplicationIds,
  hasDuplicateSkill,
  isDuplicateApplication,
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
          ? { cvVersion: input.cvVersion, appliedDate: input.appliedDate }
          : {}),
        lastUpdatedAt: now,
        checklist: [],
        activityLogs: [createLog(logMessage, now)],
      };

      return [newApplication, ...prev];
    });
  };

  // Fitur 4: Transisi status ketat + catat otomatis ke activityLogs[] (immutable)
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

  // Fitur 4: Nested Checklist (tambah, toggle, hapus — wajib immutable)
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

  // Fitur 4: Catatan manual Kapten ke activityLogs[] (immutable)
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

  // Fitur 3: Simulasi +15 Hari untuk uji badge Rawan Ghosting
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

  // Fitur 6: Hapus lamaran + Toast Undo 5 detik (useRef cleanup di useUndoDelete)
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

  return (
    <div className="min-h-screen px-2 sm:px-5 pt-3 sm:pt-5 pb-16">
      <div className="xp-desktop max-w-6xl mx-auto overflow-hidden">
        {/* Sticky XP Window Header & Menu Bar */}
        <header className="sticky top-0 z-30">
          <div className="xp-titlebar">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Aku Mw Magang — Kapten&apos;s War Room
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
              <span className="xp-win-ctrl">_</span>
              <span className="xp-win-ctrl">□</span>
              <span className="xp-win-ctrl xp-win-ctrl-close">X</span>
            </div>
          </div>

          <nav
            aria-label="Navigasi utama"
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-xp-cream border-b border-xp-cream-border"
          >
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("explorer")}
                aria-current={activeTab === "explorer" ? "page" : undefined}
                className={`px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "explorer"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                Eksplorasi Lowongan
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                aria-current={activeTab === "pipeline" ? "page" : undefined}
                className={`px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "pipeline"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
                Pipeline Lamaran ({applications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("comparator")}
                aria-current={activeTab === "comparator" ? "page" : undefined}
                className={`px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "comparator"
                    ? "bg-xp-select text-white"
                    : "text-xp-ink hover:bg-xp-soft"
                }`}
              >
                <Scale className="w-3.5 h-3.5" aria-hidden="true" />
                Bandingkan Offer ({offerCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFormModalOpen(true)}
              className="xp-btn xp-btn-green py-1 px-3"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Catat Lamaran
            </button>
          </nav>
        </header>

        {/* Main Workspace */}
        <main className="p-4 sm:p-6 space-y-5">
          {/* Banner Bentrok Global: selalu tampil dari seluruh data meski tab/filter lain aktif */}
          <ConflictBanner
            conflicts={conflicts}
            onSelectApplication={handleSelectConflictApplication}
          />

          {activeTab === "explorer" && (
            <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-5 items-start">
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
            <section className="xp-paper p-6 text-center space-y-2">
              <h2 className="font-display text-xl font-bold text-xp-deep">
                Offer Comparator ({offerCount} offer tersedia)
              </h2>
              <p className="text-xs text-slate-600">
                Akan diimplementasikan pada tahap Fitur 7 berikutnya.
              </p>
            </section>
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
          <Briefcase className="w-4 h-4" aria-hidden="true" />
          start
        </button>

        <div className="flex items-center gap-1.5 px-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("explorer")}
            className={`xp-task ${activeTab === "explorer" ? "xp-task-active" : ""}`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Eksplorasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`xp-task ${activeTab === "pipeline" ? "xp-task-active" : ""}`}
          >
            <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Pipeline</span> (
            {applications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comparator")}
            className={`xp-task ${activeTab === "comparator" ? "xp-task-active" : ""}`}
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Offer</span> ({offerCount})
          </button>
        </div>

        <div className="xp-tray hidden sm:flex">
          Aku Mw Magang &middot; PWEB 2026
        </div>
      </footer>
    </div>
  );
}

export default App;
