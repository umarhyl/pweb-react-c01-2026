import { RETRO_ICONS } from "../assets/retro";
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
      className="rounded-2xl bg-warn-soft border border-amber-300 px-5 py-4 text-ink shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-xl bg-white border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <img
            src={RETRO_ICONS.conflict}
            alt=""
            width={18}
            height={18}
            className="pixel-art"
          />
        </span>
        <div className="space-y-1.5 flex-1">
          <p className="font-pixel text-sm font-bold text-amber-950">
            Jadwal Interview Bentrok ({conflicts.length} konflik terdeteksi di
            seluruh pipeline)
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-amber-950/90">
            {conflicts.map((conflict) => (
              <li
                key={`${conflict.first.id}-${conflict.second.id}`}
                className="flex flex-wrap items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onSelectApplication?.(conflict.first.id)}
                  className="font-semibold underline text-danger hover:text-ink cursor-pointer"
                >
                  {conflict.first.company}
                </button>
                <span className="font-mono text-[11px] text-amber-900">
                  ({formatShortDateTime(conflict.first.interviewDateTime)})
                </span>
                <span>dan</span>
                <button
                  type="button"
                  onClick={() => onSelectApplication?.(conflict.second.id)}
                  className="font-semibold underline text-danger hover:text-ink cursor-pointer"
                >
                  {conflict.second.company}
                </button>
                <span className="font-mono text-[11px] text-amber-900">
                  ({formatShortDateTime(conflict.second.interviewDateTime)})
                </span>
                <span>
                  berselisih <strong>{conflict.diffMinutes} menit</strong> (&lt;
                  60 menit).
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
