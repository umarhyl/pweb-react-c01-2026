import { AlertTriangle } from "lucide-react";
import type { ScheduleConflict } from "../utils";

interface ConflictBannerProps {
  conflicts: readonly ScheduleConflict[];
  onSelectApplication?: (applicationId: string) => void;
}

function formatShortDateTime(dateTime?: string): string {
  if (!dateTime) return "-";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ConflictBanner({
  conflicts,
  onSelectApplication,
}: ConflictBannerProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="bg-red-50 border-2 border-xp-danger rounded-sm p-3 text-red-950 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="w-5 h-5 text-xp-danger shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-bold text-red-900">
            Peringatan Bentrok Jadwal Interview ({conflicts.length} konflik
            terdeteksi di seluruh pipeline):
          </p>
          <ul className="space-y-1 text-xs">
            {conflicts.map((conflict) => (
              <li
                key={`${conflict.first.id}-${conflict.second.id}`}
                className="flex flex-wrap items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onSelectApplication?.(conflict.first.id)}
                  className="font-bold underline text-xp-deep hover:text-xp-bar cursor-pointer"
                >
                  {conflict.first.company}
                </button>
                <span className="font-mono text-[11px]">
                  ({formatShortDateTime(conflict.first.interviewDateTime)})
                </span>
                <span>dan</span>
                <button
                  type="button"
                  onClick={() => onSelectApplication?.(conflict.second.id)}
                  className="font-bold underline text-xp-deep hover:text-xp-bar cursor-pointer"
                >
                  {conflict.second.company}
                </button>
                <span className="font-mono text-[11px]">
                  ({formatShortDateTime(conflict.second.interviewDateTime)})
                </span>
                <span>
                  berselisih{" "}
                  <strong>{conflict.diffMinutes} menit</strong> (&lt; 60 menit).
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
