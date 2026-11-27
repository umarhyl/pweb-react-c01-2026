import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AlertCircle, Briefcase, FilePlus2, Paperclip, Upload, X } from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import type {
  Application,
  CvAttachment,
  InitialApplicationStatus,
  WorkMode,
} from "../types";
import { formatFileSize, isDuplicateApplication, readCvFile } from "../utils";

export interface ManualApplicationInput {
  company: string;
  role: string;
  workMode: WorkMode;
  status: InitialApplicationStatus;
  requiredSkills: string[];
  jobUrl?: string;
  cvVersion?: string;
  cvAttachment?: CvAttachment;
  appliedDate?: string;
}

interface ApplicationFormModalProps {
  isOpen: boolean;
  applications: readonly Application[];
  initialData?: Partial<ManualApplicationInput> | null;
  onClose: () => void;
  onSubmit: (data: ManualApplicationInput) => void;
}

interface FormErrors {
  company?: string;
  role?: string;
  duplicate?: string;
  requiredSkills?: string;
  cvVersion?: string;
  appliedDate?: string;
}

const WORK_MODES: readonly WorkMode[] = ["Remote", "Hybrid", "Onsite"];

function parseSkillsInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(trimmed);
    }
  }

  return result;
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ApplicationFormModal({
  isOpen,
  applications,
  initialData = null,
  onClose,
  onSubmit,
}: ApplicationFormModalProps) {
  const [company, setCompany] = useState(initialData?.company ?? "");
  const [role, setRole] = useState(initialData?.role ?? "");
  const [workMode, setWorkMode] = useState<WorkMode>(
    initialData?.workMode ?? "Remote",
  );
  const [status, setStatus] = useState<InitialApplicationStatus>(
    initialData?.status ?? "WISHLIST",
  );
  const [skillsInput, setSkillsInput] = useState(
    initialData?.requiredSkills ? initialData.requiredSkills.join(", ") : "",
  );
  const [jobUrl, setJobUrl] = useState(initialData?.jobUrl ?? "");
  const [cvVersion, setCvVersion] = useState(initialData?.cvVersion ?? "");
  const [cvAttachment, setCvAttachment] = useState<CvAttachment | undefined>(
    undefined,
  );
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [appliedDate, setAppliedDate] = useState(
    initialData?.appliedDate ??
      (initialData?.status === "APPLIED" ? getTodayIsoDate() : ""),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const companyRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef<HTMLInputElement | null>(null);
  const skillsRef = useRef<HTMLInputElement | null>(null);
  const cvVersionRef = useRef<HTMLInputElement | null>(null);
  const appliedDateRef = useRef<HTMLInputElement | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedSkills = useMemo(() => parseSkillsInput(skillsInput), [skillsInput]);

  useEffect(() => {
    if (!isOpen) return;

    companyRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.duplicate) return prev;
      const next: FormErrors = { ...prev };
      delete next[field];
      if (field === "company" || field === "role") {
        delete next.duplicate;
      }
      return next;
    });
  };

  const resetForm = () => {
    setCompany("");
    setRole("");
    setWorkMode("Remote");
    setStatus("WISHLIST");
    setSkillsInput("");
    setJobUrl("");
    setCvVersion("");
    setCvAttachment(undefined);
    setCvUploadError(null);
    setAppliedDate("");
    setErrors({});
  };

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
    clearError("cvVersion");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    const trimmedCv = cvVersion.trim();
    const trimmedDate = appliedDate.trim();

    const nextErrors: FormErrors = {};
    const errorInputs: Array<HTMLInputElement | null> = [];

    const markError = (
      field: keyof FormErrors,
      message: string,
      input: HTMLInputElement | null,
    ) => {
      nextErrors[field] = message;
      errorInputs.push(input);
    };

    if (trimmedCompany.length === 0) {
      markError("company", "Nama perusahaan wajib diisi.", companyRef.current);
    }

    if (trimmedRole.length === 0) {
      markError("role", "Posisi/Role wajib diisi.", roleRef.current);
    }

    if (
      trimmedCompany.length > 0 &&
      trimmedRole.length > 0 &&
      isDuplicateApplication(applications, trimmedCompany, trimmedRole)
    ) {
      markError(
        "duplicate",
        `Lamaran "${trimmedRole}" di "${trimmedCompany}" sudah ada di daftar lamaran.`,
        companyRef.current,
      );
    }

    if (parsedSkills.length === 0) {
      markError(
        "requiredSkills",
        "Isi minimal 1 required skill (pisahkan dengan koma).",
        skillsRef.current,
      );
    }

    if (status === "APPLIED") {
      if (trimmedCv.length === 0) {
        markError(
          "cvVersion",
          "Versi CV wajib diisi saat status awal APPLIED.",
          cvVersionRef.current,
        );
      }
      if (trimmedDate.length === 0) {
        markError(
          "appliedDate",
          "Tanggal melamar wajib diisi saat status awal APPLIED.",
          appliedDateRef.current,
        );
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstInvalidInput = errorInputs.find(
        (input): input is HTMLInputElement => input !== null,
      );
      firstInvalidInput?.focus();
      return;
    }

    onSubmit({
      company: trimmedCompany,
      role: trimmedRole,
      workMode,
      status,
      requiredSkills: parsedSkills,
      ...(jobUrl.trim().length > 0 ? { jobUrl: jobUrl.trim() } : {}),
      ...(status === "APPLIED"
        ? {
            cvVersion: trimmedCv,
            cvAttachment,
            appliedDate: trimmedDate,
          }
        : {}),
    });

    resetForm();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-application-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/55 dark:bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="craft-modal w-full max-w-lg my-auto">
        <div className="craft-modal-header">
          <span
            id="manual-application-modal-title"
            className="inline-flex items-center gap-2 font-pixel font-bold text-base text-white"
          >
            <img
              src={RETRO_ICONS.plus}
              alt=""
              width={16}
              height={16}
              className="pixel-art brightness-200"
            />
            Catat Lamaran Manual
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup form tambah lamaran"
            className="craft-win-dot cursor-pointer hover:bg-danger hover:border-danger hover:text-white"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4">
          {errors.duplicate && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-danger-soft border border-danger/40 text-danger text-xs flex items-start gap-2"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 text-danger mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Lamaran Duplikat Ditolak</p>
                <p className="mt-0.5">{errors.duplicate}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label
                htmlFor="manual-company"
                className="block text-xs font-semibold text-ink"
              >
                Perusahaan <span className="text-danger">*</span>
              </label>
              <input
                ref={companyRef}
                id="manual-company"
                type="text"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  clearError("company");
                }}
                placeholder="mis. Nusantara Cloud Tech"
                aria-invalid={Boolean(errors.company || errors.duplicate)}
                className={`craft-input ${
                  errors.company || errors.duplicate
                    ? "border-danger bg-danger-soft/30"
                    : ""
                }`}
              />
              {errors.company && (
                <p role="alert" className="text-[11px] font-medium text-danger">
                  {errors.company}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="manual-role"
                className="block text-xs font-semibold text-ink"
              >
                Posisi / Role <span className="text-danger">*</span>
              </label>
              <input
                ref={roleRef}
                id="manual-role"
                type="text"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  clearError("role");
                }}
                placeholder="mis. Frontend Engineer Intern"
                aria-invalid={Boolean(errors.role || errors.duplicate)}
                className={`craft-input ${
                  errors.role || errors.duplicate
                    ? "border-danger bg-danger-soft/30"
                    : ""
                }`}
              />
              {errors.role && (
                <p role="alert" className="text-[11px] font-medium text-danger">
                  {errors.role}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label
                htmlFor="manual-work-mode"
                className="block text-xs font-semibold text-ink"
              >
                Mode Kerja <span className="text-danger">*</span>
              </label>
              <select
                id="manual-work-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="craft-input"
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="manual-initial-status"
                className="block text-xs font-semibold text-ink"
              >
                Status Awal <span className="text-danger">*</span>
              </label>
              <select
                id="manual-initial-status"
                value={status}
                onChange={(e) => {
                  const nextStatus = e.target.value as InitialApplicationStatus;
                  setStatus(nextStatus);
                  if (nextStatus === "WISHLIST") {
                    setErrors((prev) => {
                      const next: FormErrors = { ...prev };
                      delete next.cvVersion;
                      delete next.appliedDate;
                      return next;
                    });
                  }
                }}
                className="craft-input"
              >
                <option value="WISHLIST">WISHLIST (Simpan dulu)</option>
                <option value="APPLIED">APPLIED (Sudah kirim lamaran)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manual-skills"
              className="block text-xs font-semibold text-ink"
            >
              Required Skills (pisahkan dengan koma){" "}
              <span className="text-danger">*</span>
            </label>
            <input
              ref={skillsRef}
              id="manual-skills"
              type="text"
              value={skillsInput}
              onChange={(e) => {
                setSkillsInput(e.target.value);
                clearError("requiredSkills");
              }}
              placeholder="React, TypeScript, Tailwind CSS, Docker"
              aria-invalid={Boolean(errors.requiredSkills)}
              className={`craft-input ${
                errors.requiredSkills ? "border-danger bg-danger-soft/30" : ""
              }`}
            />
            {errors.requiredSkills && (
              <p role="alert" className="text-[11px] font-medium text-danger">
                {errors.requiredSkills}
              </p>
            )}
            {parsedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {parsedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cream-soft border border-line text-ink"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Conditional inputs when initial status === APPLIED */}
          {status === "APPLIED" && (
            <div className="craft-card-warm p-4 space-y-3">
              <p className="text-xs font-semibold text-leaf-deep flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                Detail Pengiriman Lamaran (Wajib untuk APPLIED)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="manual-cv-version"
                    className="block text-xs font-semibold text-ink"
                  >
                    Versi CV <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={cvVersionRef}
                    id="manual-cv-version"
                    type="text"
                    value={cvVersion}
                    onChange={(e) => {
                      setCvVersion(e.target.value);
                      clearError("cvVersion");
                    }}
                    placeholder="mis. Kapten-CV-v2.pdf"
                    aria-invalid={Boolean(errors.cvVersion)}
                    className={`craft-input ${
                      errors.cvVersion ? "border-danger bg-danger-soft/30" : ""
                    }`}
                  />
                  {errors.cvVersion && (
                    <p role="alert" className="text-[11px] font-medium text-danger">
                      {errors.cvVersion}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="manual-applied-date"
                    className="block text-xs font-semibold text-ink"
                  >
                    Tanggal Melamar <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={appliedDateRef}
                    id="manual-applied-date"
                    type="date"
                    value={appliedDate}
                    onChange={(e) => {
                      setAppliedDate(e.target.value);
                      clearError("appliedDate");
                    }}
                    aria-invalid={Boolean(errors.appliedDate)}
                    className={`craft-input ${
                      errors.appliedDate ? "border-danger bg-danger-soft/30" : ""
                    }`}
                  />
                  {errors.appliedDate && (
                    <p role="alert" className="text-[11px] font-medium text-danger">
                      {errors.appliedDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-line space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">
                    Lampirkan file CV lokal (opsional, PDF/DOC/DOCX maks. 500 KB)
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
                    aria-label="Upload file CV lokal"
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

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <button type="button" onClick={handleClose} className="craft-btn">
              Batal
            </button>
            <button type="submit" className="craft-btn craft-btn-primary">
              <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
              Simpan Lamaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
