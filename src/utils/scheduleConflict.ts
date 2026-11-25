import type { Application } from "../types";

export const CONFLICT_THRESHOLD_MINUTES = 60;

export interface ScheduleConflict {
  first: Application;
  second: Application;
  diffMinutes: number;
}

function parseInterviewTimestamp(dateTime?: string): number | null {
  if (!dateTime || dateTime.trim().length === 0) return null;
  const timestamp = Date.parse(dateTime);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function findInterviewConflicts(
  applications: readonly Application[],
  thresholdMinutes = CONFLICT_THRESHOLD_MINUTES,
): ScheduleConflict[] {
  const scheduledInterviews: Array<{ app: Application; timestamp: number }> = [];

  for (const app of applications) {
    if (app.status !== "INTERVIEW") continue;
    const timestamp = parseInterviewTimestamp(app.interviewDateTime);
    if (timestamp !== null) {
      scheduledInterviews.push({ app, timestamp });
    }
  }

  scheduledInterviews.sort((a, b) => a.timestamp - b.timestamp);

  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < scheduledInterviews.length; i++) {
    for (let j = i + 1; j < scheduledInterviews.length; j++) {
      const diffMinutes =
        Math.abs(
          scheduledInterviews[j].timestamp - scheduledInterviews[i].timestamp,
        ) / 60_000;

      if (diffMinutes < thresholdMinutes) {
        conflicts.push({
          first: scheduledInterviews[i].app,
          second: scheduledInterviews[j].app,
          diffMinutes: Math.round(diffMinutes),
        });
      }
    }
  }

  return conflicts;
}

export function hasInterviewConflict(
  applications: readonly Application[],
  thresholdMinutes = CONFLICT_THRESHOLD_MINUTES,
): boolean {
  return findInterviewConflicts(applications, thresholdMinutes).length > 0;
}

export function getConflictingApplicationIds(
  applications: readonly Application[],
  thresholdMinutes = CONFLICT_THRESHOLD_MINUTES,
): Set<string> {
  const conflicts = findInterviewConflicts(applications, thresholdMinutes);
  const ids = new Set<string>();

  for (const conflict of conflicts) {
    ids.add(conflict.first.id);
    ids.add(conflict.second.id);
  }

  return ids;
}
