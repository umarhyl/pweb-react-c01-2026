import { useState } from "react";
import { Briefcase, Compass, LayoutList, Scale, Plus } from "lucide-react";
import {
  ApplicationFormModal,
  JobExplorer,
  SkillProfile,
} from "./components";
import type { ManualApplicationInput } from "./components";
import { useLocalStorage } from "./hooks";
import type { Application, JobDataSource, JobListing, WorkMode } from "./types";
import { hasDuplicateSkill, isDuplicateApplication } from "./utils";

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

  const offerCount = applications.filter((app) => app.status === "OFFER").length;

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
          {
            id: createId(),
            timestamp: now,
            message: "Disimpan ke Wishlist dari Eksplorasi Lowongan.",
          },
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
        activityLogs: [
          {
            id: createId(),
            timestamp: now,
            message: logMessage,
          },
        ],
      };

      return [newApplication, ...prev];
    });
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
            <section className="xp-paper p-6 text-center space-y-2">
              <h2 className="font-display text-xl font-bold text-xp-deep">
                War Room Pipeline ({applications.length} lamaran tersimpan)
              </h2>
              <p className="text-xs text-slate-600">
                Slot tab ini akan diisi komponen Pipeline dari branch{" "}
                <code className="font-mono bg-xp-cream px-1.5 py-0.5 border border-xp-border">
                  feat/warroom-detail-undo
                </code>
                .
              </p>
            </section>
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
            <span className="hidden sm:inline">Pipeline</span> ({applications.length})
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
