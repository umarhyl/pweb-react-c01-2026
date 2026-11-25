import type {
  ApplicationStatus,
  StatusTransitionPayload,
  TransitionValidationResult,
  WorkMode,
} from "../types";

export const ALLOWED_TRANSITIONS: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  WISHLIST: ["APPLIED"],
  APPLIED: ["SCREENING", "REJECTED", "GHOSTED"],
  SCREENING: ["INTERVIEW", "REJECTED", "GHOSTED"],
  INTERVIEW: ["OFFER", "REJECTED", "GHOSTED"],
  OFFER: [],
  REJECTED: [],
  GHOSTED: ["SCREENING"],
};

export const STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

const VALID_WORK_MODES: readonly WorkMode[] = ["Remote", "Hybrid", "Onsite"];

function isValidWorkMode(value: unknown): value is WorkMode {
  return (
    typeof value === "string" &&
    VALID_WORK_MODES.includes(value as WorkMode)
  );
}

export function isFinalStatus(status: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function getAllowedNextStatuses(
  currentStatus: ApplicationStatus,
): readonly ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

export function canTransitionStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function validateStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  payload: StatusTransitionPayload = {},
): TransitionValidationResult {
  if (!canTransitionStatus(from, to)) {
    return {
      valid: false,
      errors: [`Transisi dari ${from} ke ${to} tidak diizinkan.`],
    };
  }

  const errors: string[] = [];

  switch (to) {
    case "APPLIED": {
      if (!payload.cvVersion || payload.cvVersion.trim().length === 0) {
        errors.push("Versi CV wajib diisi saat pindah ke APPLIED.");
      }
      if (!payload.appliedDate || payload.appliedDate.trim().length === 0) {
        errors.push("Tanggal melamar wajib diisi saat pindah ke APPLIED.");
      }
      break;
    }
    case "INTERVIEW": {
      if (
        !payload.interviewDateTime ||
        payload.interviewDateTime.trim().length === 0
      ) {
        errors.push("Jadwal interview wajib diisi saat pindah ke INTERVIEW.");
      } else if (Number.isNaN(Date.parse(payload.interviewDateTime))) {
        errors.push("Format jadwal interview tidak valid.");
      }
      break;
    }
    case "OFFER": {
      if (
        typeof payload.salaryOffer !== "number" ||
        !Number.isFinite(payload.salaryOffer) ||
        payload.salaryOffer <= 0
      ) {
        errors.push("Nominal gaji/uang saku wajib lebih dari 0 saat OFFER.");
      }
      if (!isValidWorkMode(payload.workMode)) {
        errors.push("Mode kerja (Remote/Hybrid/Onsite) wajib dipilih saat OFFER.");
      }
      break;
    }
    case "WISHLIST":
    case "SCREENING":
    case "REJECTED":
    case "GHOSTED":
      break;
    default: {
      const _exhaustive: never = to;
      return _exhaustive;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
