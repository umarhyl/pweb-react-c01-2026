import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  ExternalLink,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import type {
  Application,
  ApplicationStatus,
  CvAttachment,
  StatusTransitionPayload,
  WorkMode,
} from "../types";
import {
  STATUS_LABELS,
  calculateSkillMatch,
  formatFileSize,
  getAllowedNextStatuses,
  getDaysSinceUpdate,
  isFinalStatus,
  isGhostingRisk,
  openCvPreview,
  readCvFile,
  validateStatusTransition,
} from "../utils";
import { InterviewPrepTimer } from "./InterviewPrepTimer";

interface ApplicationDetailModalProps {
  application: Application;
  userSkills: readonly string[];
  hasConflict: boolean;
  onClose: () => void;
  onTransitionStatus: (
    applicationId: string,
    nextStatus: ApplicationStatus,
    payload: StatusTransitionPayload,
  ) => void;
  onAddChecklistItem: (applicationId: string, text: string) => void;
  onToggleChecklistItem: (applicationId: string, itemId: string) => void;
  onDeleteChecklistItem: (applicationId: string, itemId: string) => void;
  onAddActivityNote: (applicationId: string, message: string) => void;
  onSimulateGhosting: (applicationId: string) => void;
  onDeleteApplication: (applicationId: string) => void;
}

const PIPELINE_STEPS: readonly ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
];

const WORK_MODES: readonly WorkMode[] = ["Remote", "Hybrid", "Onsite"];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLogTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ApplicationDetailModal({
  application,
  userSkills,
  hasConflict,
  onClose,
  onTransitionStatus,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddActivityNote,
  onSimulateGhosting,
  onDeleteApplication,
}: ApplicationDetailModalProps) {
  const allowedNextStatuses = getAllowedNextStatuses(application.status);
  const finalStatus = isFinalStatus(application.status);
  const ghostRisk = isGhostingRisk(application);
  const daysSinceUpdate = getDaysSinceUpdate(application.lastUpdatedAt);
  const skillMatch = calculateSkillMatch(userSkills, application.requiredSkills);

  const [chosenNextStatus, setChosenNextStatus] =
    useState<ApplicationStatus | null>(null);
  const selectedNextStatus: ApplicationStatus | null =
    chosenNextStatus && allowedNextStatuses.includes(chosenNextStatus)
      ? chosenNextStatus
      : (allowedNextStatuses[0] ?? null);

  const [cvVersion, setCvVersion] = useState(application.cvVersion ?? "");
  const [cvAttachment, setCvAttachment] = useState<CvAttachment | undefined>(
    application.cvAttachment,
  );
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [appliedDate, setAppliedDate] = useState(
    application.appliedDate ?? getTodayDateString(),
  );
  const [interviewDateTime, setInterviewDateTime] = useState(
    application.interviewDateTime ?? "",
  );
  const [salaryOfferInput, setSalaryOfferInput] = useState(
    application.salaryOffer ? String(application.salaryOffer) : "",
  );
  const [offerWorkMode, setOfferWorkMode] = useState<WorkMode>(
    application.workMode,
  );
  const [transitionErrors, setTransitionErrors] = useState<string[]>([]);

  const [newChecklistText, setNewChecklistText] = useState("");
  const [manualNote, setManualNote] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleCvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const result = await readCvFile(file);
    if (!result.ok) {
      setCvUploadError(result.error);
      return;
    }

    setCvUploadError(null);
    setCvAttachment(result.attachment);
    setCvVersion(result.attachment.fileName);
  };

  const handleConfirmTransition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNextStatus) return;

    const payload: StatusTransitionPayload = {};
    if (selectedNextStatus === "APPLIED") {
      payload.cvVersion = cvVersion.trim();
      payload.cvAttachment = cvAttachment;
      payload.appliedDate = appliedDate.trim();
    } else if (selectedNextStatus === "INTERVIEW") {
      payload.interviewDateTime = interviewDateTime.trim();
    } else if (selectedNextStatus === "OFFER") {
      const parsedSalary = Number(salaryOfferInput);
      payload.salaryOffer = Number.isFinite(parsedSalary) ? parsedSalary : 0;
      payload.workMode = offerWorkMode;
    }

    const validation = validateStatusTransition(
      application.status,
      selectedNextStatus,
      payload,
    );

    if (!validation.valid) {
      setTransitionErrors(validation.errors);
      return;
    }

    setTransitionErrors([]);
    setChosenNextStatus(null);
    onTransitionStatus(application.id, selectedNextStatus, payload);
  };

  const handleChecklistSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newChecklistText.trim();
    if (trimmed.length === 0) return;

    onAddChecklistItem(application.id, trimmed);
    setNewChecklistText("");
  };

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualNote.trim();
    if (trimmed.length === 0) return;

    onAddActivityNote(application.id, trimmed);
    setManualNote("");
  };

  const completedChecklist = application.checklist.filter(
    (item) => item.done,
  ).length;
  const totalChecklist = application.checklist.length;
  const checklistPercent =
    totalChecklist > 0
      ? Math.round((completedChecklist / totalChecklist) * 100)
      : 0;

  const currentStepIndex = PIPELINE_STEPS.indexOf(application.status);
  const canSimulateGhosting =
    application.status === "APPLIED" || application.status === "SCREENING";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 dark:bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="craft-modal w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="craft-modal-header shrink-0">
          <span
            id="detail-modal-title"
            className="truncate flex items-center gap-2 font-pixel font-bold text-base text-white"
          >
            <img
              src={RETRO_ICONS.checklist}
              alt=""
              width={16}
              height={16}
              className="pixel-art shrink-0"
            />
            Detail Lamaran: {application.role} ({application.company})
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail lamaran"
            className="craft-win-dot cursor-pointer hover:bg-danger hover:border-danger hover:text-white shrink-0"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto craft-scroll space-y-5 bg-cream-soft/55">
          {/* Ringkasan Header Lamaran */}
          <div className="craft-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-pixel text-xl font-bold text-ink">
                  {application.role} &middot; {application.company}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-soft text-sky-deep border border-sky">
                  {STATUS_LABELS[application.status]}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-leaf-soft text-leaf-deep border border-leaf/40">
                  {skillMatch.score}% Match
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span>
                  Mode: <strong className="text-ink">{application.workMode}</strong>
                </span>
                {application.cvVersion && (
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span>
                      CV: <strong className="text-ink">{application.cvVersion}</strong>
                    </span>
                    {application.cvAttachment && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (application.cvAttachment) {
                              openCvPreview(application.cvAttachment);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-soft text-sky-deep border border-sky hover:bg-surface cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          Preview
                        </button>
                        <a
                          href={application.cvAttachment.dataUrl}
                          download={application.cvAttachment.fileName}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cream-soft text-ink border border-line-strong hover:bg-surface"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                          Unduh ({formatFileSize(application.cvAttachment.sizeBytes)})
                        </a>
                      </>
                    )}
                  </span>
                )}
                {application.appliedDate && (
                  <span>
                    Applied:{" "}
                    <strong className="font-mono text-ink">
                      {application.appliedDate}
                    </strong>
                  </span>
                )}
                {application.interviewDateTime && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock
                      className="w-3.5 h-3.5 text-leaf-deep"
                      aria-hidden="true"
                    />
                    <strong className="font-mono text-ink">
                      {formatLogTimestamp(application.interviewDateTime)}
                    </strong>
                  </span>
                )}
                {typeof application.salaryOffer === "number" &&
                  application.salaryOffer > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Offer: {formatCurrency(application.salaryOffer)}
                    </span>
                  )}
                {application.jobUrl && (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-leaf hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    Web Lowongan Asli
                  </a>
                )}
              </div>

              {(ghostRisk || hasConflict) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ghostRisk && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-warn-soft dark:text-amber-200 dark:border-amber-500/50">
                      <img
                        src={RETRO_ICONS.ghost}
                        alt=""
                        width={13}
                        height={13}
                        className="pixel-art"
                      />
                      Rawan Ghosting ({daysSinceUpdate} hari tanpa update)
                    </span>
                  )}
                  {hasConflict && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-danger-soft text-danger border border-danger/40">
                      <img
                        src={RETRO_ICONS.conflict}
                        alt=""
                        width={13}
                        height={13}
                        className="pixel-art"
                      />
                      Bentrok dengan jadwal interview lain (&lt; 60 menit)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canSimulateGhosting && (
                <button
                  type="button"
                  onClick={() => onSimulateGhosting(application.id)}
                  className="craft-btn py-1.5 px-3"
                >
                  <img
                    src={RETRO_ICONS.ghost}
                    alt=""
                    width={14}
                    height={14}
                    className="pixel-art"
                  />
                  Simulasi +15 Hari
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onDeleteApplication(application.id);
                  onClose();
                }}
                className="craft-btn craft-btn-danger py-1.5 px-3.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Hapus
              </button>
            </div>
          </div>

          {/* Grid Utama 2 Kolom */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Kolom Kiri: State Machine + Nested Checklist */}
            <div className="lg:col-span-7 space-y-5">
              {/* State Machine */}
              <section
                className="craft-card p-5 space-y-4"
                aria-label="Tahap Seleksi dan Transisi Status"
              >
                <div className="border-b border-line pb-2.5">
                  <span className="craft-eyebrow">State Machine</span>
                  <h3 className="font-pixel text-lg font-bold text-ink">
                    Tahap Seleksi &amp; Transisi Status
                  </h3>
                </div>

                {/* Visual Stepper */}
                <ol className="grid grid-cols-5 gap-2 text-[11px]">
                  {PIPELINE_STEPS.map((step, index) => {
                    const isPassed =
                      currentStepIndex >= 0 && index <= currentStepIndex;
                    const isCurrent = application.status === step;
                    return (
                      <li key={step} className="space-y-1.5">
                        <div
                          className={`h-2 rounded-full ${
                            isCurrent
                              ? "bg-leaf"
                              : isPassed
                                ? "bg-leaf/60"
                                : "bg-cream"
                          }`}
                        />
                        <span
                          className={`block truncate ${
                            isCurrent
                              ? "font-bold text-leaf-deep"
                              : isPassed
                                ? "font-semibold text-ink"
                                : "text-muted"
                          }`}
                        >
                          {index + 1}. {STATUS_LABELS[step]}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {(application.status === "REJECTED" ||
                  application.status === "GHOSTED") && (
                  <p className="text-xs px-3.5 py-2.5 rounded-xl bg-cream-soft border border-line text-ink">
                    Status saat ini:{" "}
                    <strong>{STATUS_LABELS[application.status]}</strong>.{" "}
                    {application.status === "GHOSTED"
                      ? "Khusus GHOSTED masih boleh kembali ke SCREENING jika HRD menghubungi lagi."
                      : "Status ini bersifat final."}
                  </p>
                )}

                {finalStatus ? (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-leaf-soft border border-leaf/40 text-xs text-leaf-deep">
                    <CheckCircle2
                      className="w-4 h-4 text-leaf shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Status{" "}
                      <strong>{STATUS_LABELS[application.status]}</strong>{" "}
                      bersifat <strong>final</strong> sesuai Diagram State
                      Machine dan tidak dapat dipindahkan lagi.
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleConfirmTransition}
                    className="space-y-3.5 craft-card-warm p-4"
                    noValidate
                  >
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold text-ink">
                        Pindahkan status ke:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {allowedNextStatuses.map((nextStatus) => {
                          const isSelected = selectedNextStatus === nextStatus;
                          return (
                            <button
                              key={nextStatus}
                              type="button"
                              onClick={() => {
                                setChosenNextStatus(nextStatus);
                                setTransitionErrors([]);
                              }}
                              className={`craft-btn py-1.5 px-3.5 ${
                                isSelected ? "craft-btn-primary" : ""
                              }`}
                            >
                              <ArrowRight
                                className="w-3 h-3"
                                aria-hidden="true"
                              />
                              {STATUS_LABELS[nextStatus]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Input Kondisional: APPLIED */}
                    {selectedNextStatus === "APPLIED" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="transition-cv-version"
                              className="block text-[11.5px] font-semibold text-ink mb-1"
                            >
                              Versi CV *
                            </label>
                            <input
                              id="transition-cv-version"
                              type="text"
                              value={cvVersion}
                              onChange={(e) => setCvVersion(e.target.value)}
                              placeholder="mis. Kapten-CV-v2.pdf"
                              className="craft-input text-xs"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="transition-applied-date"
                              className="block text-[11.5px] font-semibold text-ink mb-1"
                            >
                              Tanggal Melamar *
                            </label>
                            <input
                              id="transition-applied-date"
                              type="date"
                              value={appliedDate}
                              onChange={(e) => setAppliedDate(e.target.value)}
                              className="craft-input text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-muted">
                              Upload file CV lokal (opsional, PDF/DOC/DOCX maks. 500 KB)
                            </span>
                            <button
                              type="button"
                              onClick={() => cvFileInputRef.current?.click()}
                              className="craft-btn py-1 px-3 text-[11px]"
                            >
                              <Upload className="w-3 h-3" aria-hidden="true" />
                              Upload File CV
                            </button>
                            <input
                              ref={cvFileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf"
                              onChange={(e) => {
                                void handleCvFileChange(e);
                              }}
                              className="hidden"
                              aria-label="Upload file CV untuk status APPLIED"
                            />
                          </div>

                          {cvAttachment && (
                            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line text-[11px]">
                              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                                <Paperclip
                                  className="w-3 h-3 text-leaf-deep shrink-0"
                                  aria-hidden="true"
                                />
                                <strong className="truncate text-ink">
                                  {cvAttachment.fileName}
                                </strong>
                                <span className="font-mono text-muted shrink-0">
                                  ({formatFileSize(cvAttachment.sizeBytes)})
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setCvAttachment(undefined)}
                                aria-label="Hapus lampiran file CV"
                                className="text-muted hover:text-danger cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}

                          {cvUploadError && (
                            <p role="alert" className="text-[11px] font-medium text-danger">
                              {cvUploadError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Input Kondisional: INTERVIEW */}
                    {selectedNextStatus === "INTERVIEW" && (
                      <div>
                        <label
                          htmlFor="transition-interview-datetime"
                          className="block text-[11.5px] font-semibold text-ink mb-1"
                        >
                          Jadwal Interview (YYYY-MM-DDTHH:mm) *
                        </label>
                        <input
                          id="transition-interview-datetime"
                          type="datetime-local"
                          value={interviewDateTime}
                          onChange={(e) => setInterviewDateTime(e.target.value)}
                          className="craft-input text-xs"
                        />
                      </div>
                    )}

                    {/* Input Kondisional: OFFER */}
                    {selectedNextStatus === "OFFER" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="transition-salary-offer"
                            className="block text-[11.5px] font-semibold text-ink mb-1"
                          >
                            Nominal Gaji / Uang Saku (Rp) *
                          </label>
                          <input
                            id="transition-salary-offer"
                            type="number"
                            min={1}
                            step={100000}
                            value={salaryOfferInput}
                            onChange={(e) =>
                              setSalaryOfferInput(e.target.value)
                            }
                            placeholder="mis. 5500000"
                            className="craft-input text-xs"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="transition-work-mode"
                            className="block text-[11.5px] font-semibold text-ink mb-1"
                          >
                            Mode Kerja *
                          </label>
                          <select
                            id="transition-work-mode"
                            value={offerWorkMode}
                            onChange={(e) =>
                              setOfferWorkMode(e.target.value as WorkMode)
                            }
                            className="craft-input text-xs"
                          >
                            {WORK_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {transitionErrors.length > 0 && (
                      <ul
                        role="alert"
                        className="text-xs font-medium text-danger bg-danger-soft border border-danger/35 rounded-xl p-3 space-y-0.5"
                      >
                        {transitionErrors.map((err) => (
                          <li key={err}>• {err}</li>
                        ))}
                      </ul>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!selectedNextStatus}
                        className="craft-btn craft-btn-primary"
                      >
                        Konfirmasi Pindah ke{" "}
                        {selectedNextStatus
                          ? STATUS_LABELS[selectedNextStatus]
                          : "..."}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Nested Checklist Persiapan */}
              <section
                className="craft-card p-5 space-y-3.5"
                aria-label="Daftar Persiapan"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={RETRO_ICONS.checklist}
                      alt=""
                      width={16}
                      height={16}
                      className="pixel-art"
                    />
                    <h3 className="font-pixel text-lg font-bold text-ink">
                      Daftar Persiapan
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-semibold text-leaf-deep">
                    {completedChecklist} / {totalChecklist} selesai (
                    {checklistPercent}%)
                  </span>
                </div>

                <div
                  className="craft-progress"
                  role="progressbar"
                  aria-valuenow={checklistPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progress checklist persiapan"
                >
                  <div
                    className="craft-progress-fill"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>

                {application.checklist.length === 0 ? (
                  <p className="text-xs text-muted italic bg-cream-soft border border-dashed border-line-strong rounded-xl p-3">
                    Belum ada item persiapan. Tambahkan tugas pertamamu di
                    bawah.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {application.checklist.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cream-soft/60 border border-line"
                      >
                        <label className="flex items-center gap-2.5 text-xs flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() =>
                              onToggleChecklistItem(application.id, item.id)
                            }
                            className="accent-leaf"
                          />
                          <span
                            className={
                              item.done
                                ? "line-through text-muted"
                                : "text-ink"
                            }
                          >
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            onDeleteChecklistItem(application.id, item.id)
                          }
                          aria-label={`Hapus checklist ${item.text}`}
                          className="p-1 text-muted hover:text-danger cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleChecklistSubmit}
                  className="flex gap-2"
                  noValidate
                >
                  <label htmlFor="new-checklist-item" className="sr-only">
                    Tambah tugas persiapan baru
                  </label>
                  <input
                    id="new-checklist-item"
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Tambah tugas persiapan baru..."
                    className="craft-input flex-1 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={newChecklistText.trim().length === 0}
                    className="craft-btn craft-btn-primary shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Tambah
                  </button>
                </form>
              </section>
            </div>

            {/* Kolom Kanan: Latihan Interview Timer + Riwayat Aktivitas */}
            <div className="lg:col-span-5 space-y-5">
              <InterviewPrepTimer />

              {/* Activity Log */}
              <section
                className="craft-card p-5 space-y-3.5"
                aria-label="Riwayat Aktivitas"
              >
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="inline-flex items-center gap-1.5 craft-eyebrow text-leaf-deep">
                    <img
                      src={RETRO_ICONS.activityLog}
                      alt=""
                      width={15}
                      height={15}
                      className="pixel-art"
                    />
                    Riwayat Aktivitas
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cream-soft border border-line text-muted">
                    {application.activityLogs.length} catatan
                  </span>
                </div>

                <form
                  onSubmit={handleNoteSubmit}
                  className="flex gap-2"
                  noValidate
                >
                  <label htmlFor="manual-activity-note" className="sr-only">
                    Tambah catatan manual Kapten
                  </label>
                  <input
                    id="manual-activity-note"
                    type="text"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="Tulis catatan manual (mis. Follow up HRD)..."
                    className="craft-input flex-1 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={manualNote.trim().length === 0}
                    className="craft-btn shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Catat
                  </button>
                </form>

                {application.activityLogs.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Belum ada riwayat aktivitas.
                  </p>
                ) : (
                  <ul className="space-y-2.5 max-h-60 overflow-y-auto craft-scroll pr-1">
                    {application.activityLogs.map((log) => (
                      <li
                        key={log.id}
                        className="border-l-2 border-leaf/70 pl-3 py-0.5 space-y-0.5"
                      >
                        <span className="block font-mono text-[10px] text-muted">
                          {formatLogTimestamp(log.timestamp)}
                        </span>
                        <p className="text-xs text-ink leading-snug">
                          {log.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
