import { useMemo, useState } from "react";
import { Briefcase, RotateCcw } from "lucide-react";
import {
  ApplicationDetailModal,
  UndoToast,
  WarRoomPipeline,
} from "./components";
import { useLocalStorage, useUndoDelete } from "./hooks";
import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  ChecklistItem,
  StatusTransitionPayload,
} from "./types";
import { STATUS_LABELS, getConflictingApplicationIds } from "./utils";

const STORAGE_KEYS = {
  APPLICATIONS: "aku-mw-magang:applications",
  SKILLS: "aku-mw-magang:skills",
} as const;

const DEFAULT_KAPTEN_SKILLS: string[] = ["React", "TypeScript", "CSS"];

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createLog(message: string, timestamp = new Date().toISOString()): ActivityLog {
  return {
    id: createId(),
    timestamp,
    message,
  };
}

function createInitialDemoApplications(): Application[] {
  const nowIso = new Date().toISOString();

  return [
    {
      id: "demo-app-1",
      company: "GoTo Group (Gojek & Tokopedia)",
      role: "Frontend Engineer Intern",
      workMode: "Hybrid",
      status: "WISHLIST",
      requiredSkills: ["React", "TypeScript", "CSS", "Next.js"],
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: "chk-1",
          text: "Sesuaikan CV dengan proyek React + TypeScript",
          done: true,
        },
        {
          id: "chk-2",
          text: "Riset produk & engineering blog GoTo",
          done: false,
        },
      ],
      activityLogs: [createLog("Disimpan ke Wishlist", nowIso)],
    },
    {
      id: "demo-app-2",
      company: "DKatalis (Bank Jago)",
      role: "Software Engineer Intern (Web & Core Banking)",
      workMode: "Hybrid",
      status: "APPLIED",
      requiredSkills: ["React", "TypeScript", "Node.js", "Docker"],
      cvVersion: "Kapten-CV-v2.pdf",
      appliedDate: "2026-11-20",
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: "chk-3",
          text: "Kirim portofolio GitHub & live demo",
          done: true,
        },
        {
          id: "chk-4",
          text: "Latihan soal teknis React Hooks & REST API",
          done: false,
        },
      ],
      activityLogs: [
        createLog("Lamaran dikirim (CV: Kapten-CV-v2.pdf)", nowIso),
      ],
    },
    {
      id: "demo-app-3",
      company: "Garuda FinTech",
      role: "Full-Stack Web Developer Intern",
      workMode: "Remote",
      status: "INTERVIEW",
      requiredSkills: ["React", "TypeScript", "PostgreSQL", "Express"],
      cvVersion: "Kapten-CV-v2.pdf",
      appliedDate: "2026-11-10",
      interviewDateTime: "2026-11-28T10:00",
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: "chk-5",
          text: "Siapkan presentasi arsitektur proyek React",
          done: true,
        },
        {
          id: "chk-6",
          text: "Siapkan pertanyaan balik untuk pewawancara",
          done: false,
        },
      ],
      activityLogs: [
        createLog("Pindah ke INTERVIEW (jadwal 2026-11-28T10:00)", nowIso),
      ],
    },
    {
      id: "demo-app-4",
      company: "Bintang Commerce",
      role: "Software Engineer Intern — Web Platform",
      workMode: "Remote",
      status: "INTERVIEW",
      requiredSkills: ["React", "TypeScript", "CSS", "Testing"],
      cvVersion: "Kapten-CV-v3.pdf",
      appliedDate: "2026-11-12",
      interviewDateTime: "2026-11-28T10:30",
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: "chk-7",
          text: "Cek koneksi internet & kamera sebelum interview",
          done: false,
        },
      ],
      activityLogs: [
        createLog("Pindah ke INTERVIEW (jadwal 2026-11-28T10:30)", nowIso),
      ],
    },
  ];
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

export default function App() {
  const [applications, setApplications] = useLocalStorage<Application[]>(
    STORAGE_KEYS.APPLICATIONS,
    createInitialDemoApplications,
  );
  const [kaptenSkills] = useLocalStorage<string[]>(
    STORAGE_KEYS.SKILLS,
    DEFAULT_KAPTEN_SKILLS,
  );
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

  const selectedApplication = useMemo(
    () =>
      applications.find((app) => app.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );

  const conflictingIds = useMemo(
    () => getConflictingApplicationIds(applications),
    [applications],
  );

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

  // Fitur 4: Tambah catatan manual ke activityLogs[] (immutable)
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

  // Fitur 3: Simulasi +15 Hari (mundurkan lastUpdatedAt 15 hari untuk uji Rawan Ghosting)
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
      if (prev.some((app) => app.id === restored.id)) {
        return prev;
      }
      return [restored, ...prev];
    });
  };

  const handleResetDemoData = () => {
    dismissUndo();
    setSelectedApplicationId(null);
    setApplications(createInitialDemoApplications());
  };

  return (
    <div className="min-h-screen flex flex-col justify-between pb-12">
      <div className="max-w-6xl w-full mx-auto p-3 sm:p-5">
        <div className="xp-desktop overflow-hidden">
          {/* Header Window Utama */}
          <header className="xp-titlebar">
            <span className="inline-flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              Aku Mw Magang — War Room Pipeline &amp; Detail Lamaran
            </span>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="xp-btn text-[11px] py-0.5 px-2"
              title="Muat ulang data contoh untuk pengujian demo"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset Data Demo
            </button>
          </header>

          {/* Konten Utama */}
          <main className="p-4 sm:p-5 xp-grid-bg min-h-[75vh]">
            <WarRoomPipeline
              applications={applications}
              userSkills={kaptenSkills}
              onSelectApplication={setSelectedApplicationId}
              onSimulateGhosting={handleSimulateGhosting}
              onDeleteApplication={handleDeleteApplication}
            />
          </main>
        </div>
      </div>

      {/* Modal Detail Lamaran (Fitur 4 & Fitur 5 — unmount otomatis saat ditutup) */}
      {selectedApplication && (
        <ApplicationDetailModal
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

      {/* Toast Undo 5 Detik (Fitur 6) */}
      <UndoToast
        deletedApplication={pendingDeleted}
        secondsRemaining={secondsRemaining}
        onUndo={handleUndoDelete}
        onDismiss={dismissUndo}
      />

      {/* Windows XP Taskbar */}
      <footer className="xp-taskbar fixed bottom-0 inset-x-0 z-30">
        <div className="xp-start">
          <span>start</span>
        </div>
        <div className="flex items-center gap-2 px-3 overflow-x-auto">
          <span className="xp-task xp-task-active">
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
            War Room ({applications.length})
          </span>
        </div>
        <div className="xp-tray font-mono">
          Skills: {kaptenSkills.join(", ")}
        </div>
      </footer>
    </div>
  );
}
