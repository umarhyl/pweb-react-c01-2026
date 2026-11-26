import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  ChecklistItem,
  CvAttachment,
  WorkMode,
} from "../types";

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  kaptenSkills: string[];
  applications: Application[];
}

export type ParseBackupResult =
  | { ok: true; data: BackupPayload }
  | { ok: false; error: string };

const VALID_WORK_MODES: readonly WorkMode[] = ["Remote", "Hybrid", "Onsite"];
const VALID_STATUSES: readonly ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function parseChecklist(value: unknown): ChecklistItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: ChecklistItem[] = [];

  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      typeof raw.text !== "string" ||
      typeof raw.done !== "boolean"
    ) {
      return null;
    }
    items.push({ id: raw.id, text: raw.text, done: raw.done });
  }

  return items;
}

function parseActivityLogs(value: unknown): ActivityLog[] | null {
  if (!Array.isArray(value)) return null;
  const logs: ActivityLog[] = [];

  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      typeof raw.timestamp !== "string" ||
      typeof raw.message !== "string"
    ) {
      return null;
    }
    logs.push({
      id: raw.id,
      timestamp: raw.timestamp,
      message: raw.message,
    });
  }

  return logs;
}

function parseCvAttachment(raw: unknown): CvAttachment | undefined {
  if (!isRecord(raw)) return undefined;
  if (
    typeof raw.fileName !== "string" ||
    typeof raw.mimeType !== "string" ||
    typeof raw.sizeBytes !== "number" ||
    !Number.isFinite(raw.sizeBytes) ||
    typeof raw.dataUrl !== "string"
  ) {
    return undefined;
  }

  return {
    fileName: raw.fileName,
    mimeType: raw.mimeType,
    sizeBytes: raw.sizeBytes,
    dataUrl: raw.dataUrl,
  };
}

function parseApplication(raw: unknown): Application | null {
  if (!isRecord(raw)) return null;

  if (
    typeof raw.id !== "string" ||
    typeof raw.company !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.workMode !== "string" ||
    !VALID_WORK_MODES.includes(raw.workMode as WorkMode) ||
    typeof raw.status !== "string" ||
    !VALID_STATUSES.includes(raw.status as ApplicationStatus) ||
    !isStringArray(raw.requiredSkills) ||
    typeof raw.lastUpdatedAt !== "string"
  ) {
    return null;
  }

  const checklist = parseChecklist(raw.checklist);
  const activityLogs = parseActivityLogs(raw.activityLogs);
  if (!checklist || !activityLogs) return null;

  return {
    id: raw.id,
    company: raw.company,
    role: raw.role,
    workMode: raw.workMode as WorkMode,
    status: raw.status as ApplicationStatus,
    requiredSkills: raw.requiredSkills,
    jobUrl: typeof raw.jobUrl === "string" ? raw.jobUrl : undefined,
    cvVersion: typeof raw.cvVersion === "string" ? raw.cvVersion : undefined,
    cvAttachment: parseCvAttachment(raw.cvAttachment),
    appliedDate:
      typeof raw.appliedDate === "string" ? raw.appliedDate : undefined,
    interviewDateTime:
      typeof raw.interviewDateTime === "string"
        ? raw.interviewDateTime
        : undefined,
    salaryOffer:
      typeof raw.salaryOffer === "number" && Number.isFinite(raw.salaryOffer)
        ? raw.salaryOffer
        : undefined,
    lastUpdatedAt: raw.lastUpdatedAt,
    checklist,
    activityLogs,
  };
}

export function createBackupJson(
  applications: readonly Application[],
  kaptenSkills: readonly string[],
): string {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    kaptenSkills: [...kaptenSkills],
    applications: [...applications],
  };

  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(rawText: string): ParseBackupResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: "File bukan JSON yang valid.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "Struktur file backup tidak dikenali.",
    };
  }

  if (!Array.isArray(parsed.applications) || !isStringArray(parsed.kaptenSkills)) {
    return {
      ok: false,
      error: "File backup wajib memiliki array 'applications' dan 'kaptenSkills'.",
    };
  }

  const validApplications: Application[] = [];
  const seenIds = new Set<string>();
  const seenCompanyRoles = new Set<string>();

  for (const item of parsed.applications) {
    const validated = parseApplication(item);
    if (!validated) {
      return {
        ok: false,
        error: "Terdapat item lamaran yang tidak sesuai skema Application.",
      };
    }

    if (seenIds.has(validated.id)) {
      return {
        ok: false,
        error: `Terdapat ID lamaran duplikat (${validated.id}) pada file backup.`,
      };
    }

    const pairKey = `${validated.company.trim().toLowerCase()}::${validated.role.trim().toLowerCase()}`;
    if (seenCompanyRoles.has(pairKey)) {
      return {
        ok: false,
        error: `Terdapat lamaran duplikat (${validated.company} - ${validated.role}) pada file backup.`,
      };
    }

    seenIds.add(validated.id);
    seenCompanyRoles.add(pairKey);
    validApplications.push(validated);
  }

  const dedupedSkills: string[] = [];
  const seenSkills = new Set<string>();
  for (const rawSkill of parsed.kaptenSkills) {
    const trimmed = rawSkill.trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed.length > 0 && !seenSkills.has(normalized)) {
      seenSkills.add(normalized);
      dedupedSkills.push(trimmed);
    }
  }

  return {
    ok: true,
    data: {
      version: 1,
      exportedAt:
        typeof parsed.exportedAt === "string"
          ? parsed.exportedAt
          : new Date().toISOString(),
      kaptenSkills: dedupedSkills,
      applications: validApplications,
    },
  };
}
