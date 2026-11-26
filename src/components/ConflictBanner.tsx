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
      className="bg-[#fff7cc] border-2 border-xp-ink p-4 text-xp-ink shadow-[4px_4px_0_#c93b1a]"
    >
      <div className="flex items-start gap-3">
        <img
          src={RETRO_ICONS.conflict}
          alt=""
          width={20}
          height={20}
          className="xp-pixel shrink-0 mt-0.5"
        />
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-bold text-red-900">
            Jadwal Interview Bentrok ({conflicts.length} konflik terdeteksi di
            seluruh pipeline)
          </p>
          <ul className="space-y-1 text-xs leading-relaxed">
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
                <span className="font-mono text-[11px] text-slate-700">
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
                <span className="font-mono text-[11px] text-slate-700">
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
