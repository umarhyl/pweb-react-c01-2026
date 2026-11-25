import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Briefcase, FilePlus2, X } from "lucide-react";
import type {
  Application,
  InitialApplicationStatus,
  WorkMode,
} from "../types";
import { isDuplicateApplication } from "../utils";

export interface ManualApplicationInput {
  company: string;
  role: string;
  workMode: WorkMode;
  status: InitialApplicationStatus;
  requiredSkills: string[];
  cvVersion?: string;
  appliedDate?: string;
}

interface ApplicationFormModalProps {
  isOpen: boolean;
  applications: readonly Application[];
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

export function ApplicationFormModal({
  isOpen,
  applications,
  onClose,
  onSubmit,
}: ApplicationFormModalProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>("Remote");
  const [status, setStatus] = useState<InitialApplicationStatus>("WISHLIST");
  const [skillsInput, setSkillsInput] = useState("");
  const [cvVersion, setCvVersion] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const companyRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef<HTMLInputElement | null>(null);
  const skillsRef = useRef<HTMLInputElement | null>(null);
  const cvVersionRef = useRef<HTMLInputElement | null>(null);
  const appliedDateRef = useRef<HTMLInputElement | null>(null);

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
    setCvVersion("");
    setAppliedDate("");
    setErrors({});
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
      ...(status === "APPLIED"
        ? { cvVersion: trimmedCv, appliedDate: trimmedDate }
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
      className="fixed inset-0 z-50 bg-xp-ink/55 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="xp-window w-full max-w-lg shadow-2xl my-auto">
        <div className="xp-titlebar">
          <span
            id="manual-application-modal-title"
            className="inline-flex items-center gap-1.5"
          >
            <FilePlus2 className="w-4 h-4" aria-hidden="true" />
            Catat Lamaran Manual
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup form tambah lamaran"
            className="xp-win-ctrl xp-win-ctrl-close"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-5 space-y-4">
          {errors.duplicate && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-xp-danger text-red-900 text-xs flex items-start gap-2"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 text-xp-danger mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold">Lamaran Duplikat Ditolak</p>
                <p className="mt-0.5">{errors.duplicate}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="manual-company"
                className="block text-xs font-bold text-xp-ink"
              >
                Perusahaan <span className="text-red-700">*</span>
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
                className={`xp-input ${
                  errors.company || errors.duplicate ? "border-xp-danger bg-red-50/40" : ""
                }`}
              />
              {errors.company && (
                <p role="alert" className="text-[11px] font-bold text-red-700">
                  {errors.company}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="manual-role"
                className="block text-xs font-bold text-xp-ink"
              >
                Posisi / Role <span className="text-red-700">*</span>
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
                className={`xp-input ${
                  errors.role || errors.duplicate ? "border-xp-danger bg-red-50/40" : ""
                }`}
              />
              {errors.role && (
                <p role="alert" className="text-[11px] font-bold text-red-700">
                  {errors.role}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="manual-work-mode"
                className="block text-xs font-bold text-xp-ink"
              >
                Mode Kerja <span className="text-red-700">*</span>
              </label>
              <select
                id="manual-work-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="xp-input"
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
                className="block text-xs font-bold text-xp-ink"
              >
                Status Awal <span className="text-red-700">*</span>
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
                className="xp-input"
              >
                <option value="WISHLIST">WISHLIST (Simpan dulu)</option>
                <option value="APPLIED">APPLIED (Sudah kirim lamaran)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manual-skills"
              className="block text-xs font-bold text-xp-ink"
            >
              Required Skills (pisahkan dengan koma){" "}
              <span className="text-red-700">*</span>
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
              className={`xp-input ${
                errors.requiredSkills ? "border-xp-danger bg-red-50/40" : ""
              }`}
            />
            {errors.requiredSkills && (
              <p role="alert" className="text-[11px] font-bold text-red-700">
                {errors.requiredSkills}
              </p>
            )}
            {parsedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {parsedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-1.5 py-0.5 text-[11px] font-mono bg-xp-paper border border-xp-border text-xp-deep"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Conditional inputs when initial status === APPLIED */}
          {status === "APPLIED" && (
            <div className="xp-paper p-3.5 space-y-3 bg-xp-soft/30">
              <p className="text-xs font-bold text-xp-deep flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                Detail Pengiriman Lamaran (Wajib untuk APPLIED)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="manual-cv-version"
                    className="block text-xs font-bold text-xp-ink"
                  >
                    Versi CV <span className="text-red-700">*</span>
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
                    className={`xp-input ${
                      errors.cvVersion ? "border-xp-danger bg-red-50/40" : ""
                    }`}
                  />
                  {errors.cvVersion && (
                    <p role="alert" className="text-[11px] font-bold text-red-700">
                      {errors.cvVersion}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="manual-applied-date"
                    className="block text-xs font-bold text-xp-ink"
                  >
                    Tanggal Melamar <span className="text-red-700">*</span>
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
                    className={`xp-input ${
                      errors.appliedDate ? "border-xp-danger bg-red-50/40" : ""
                    }`}
                  />
                  {errors.appliedDate && (
                    <p role="alert" className="text-[11px] font-bold text-red-700">
                      {errors.appliedDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-xp-cream-border flex items-center justify-end gap-2">
            <button type="button" onClick={handleClose} className="xp-btn">
              Batal
            </button>
            <button type="submit" className="xp-btn xp-btn-green">
              <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
              Simpan Lamaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
