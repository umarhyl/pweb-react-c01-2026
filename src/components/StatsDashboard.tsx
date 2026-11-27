import { useMemo } from "react";
import { RETRO_ICONS } from "../assets/retro";
import type { Application } from "../types";
import { isGhostingRisk } from "../utils";

interface StatsDashboardProps {
  applications: readonly Application[];
}

export function StatsDashboard({ applications }: StatsDashboardProps) {
  // Seluruh 5 metrik wajib dihitung sebagai derived state (tanpa useState terpisah)
  const stats = useMemo(() => {
    const total = applications.length;
    const activeInPipeline = applications.filter(
      (app) =>
        app.status === "APPLIED" ||
        app.status === "SCREENING" ||
        app.status === "INTERVIEW",
    ).length;

    const responded = applications.filter(
      (app) =>
        app.status === "SCREENING" ||
        app.status === "INTERVIEW" ||
        app.status === "OFFER" ||
        app.status === "REJECTED",
    ).length;

    const interviewed = applications.filter(
      (app) => app.status === "INTERVIEW" || app.status === "OFFER",
    ).length;

    const ghostingRisk = applications.filter((app) =>
      isGhostingRisk(app),
    ).length;

    const ghostedCount = applications.filter(
      (app) => app.status === "GHOSTED",
    ).length;

    const offers = applications.filter((app) => app.status === "OFFER").length;

    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const interviewRate =
      total > 0 ? Math.round((interviewed / total) * 100) : 0;

    return {
      total,
      activeInPipeline,
      responded,
      interviewed,
      ghostingRisk,
      ghostedCount,
      offers,
      responseRate,
      interviewRate,
    };
  }, [applications]);

  return (
    <section aria-label="Ringkasan Statistik Lamaran">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Lamaran */}
        <article className="craft-card-flat bg-surface p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Total Lamaran
            </span>
            <span className="w-7 h-7 rounded-xl bg-sky-soft border border-sky/80 flex items-center justify-center shrink-0">
              <img
                src={RETRO_ICONS.briefcase}
                alt=""
                width={15}
                height={15}
                className="pixel-art"
              />
            </span>
          </div>
          <p className="font-pixel text-3xl font-bold leading-none text-leaf-deep">
            {stats.total}
          </p>
          <p className="text-[11.5px] text-muted">
            {stats.activeInPipeline} aktif di pipeline
          </p>
        </article>

        {/* 2. Response Rate % */}
        <article className="craft-card-flat bg-surface p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Response Rate
            </span>
            <span className="w-7 h-7 rounded-xl bg-sky-soft border border-sky/80 flex items-center justify-center shrink-0">
              <img
                src={RETRO_ICONS.stats}
                alt=""
                width={15}
                height={15}
                className="pixel-art"
              />
            </span>
          </div>
          <p className="font-pixel text-3xl font-bold leading-none text-leaf">
            {stats.responseRate}%
          </p>
          <p className="text-[11.5px] text-muted">
            {stats.responded} dari {stats.total} diproses
          </p>
        </article>

        {/* 3. Interview Rate % */}
        <article className="craft-card-flat bg-surface p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Interview Rate
            </span>
            <span className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-700/70 flex items-center justify-center shrink-0">
              <img
                src={RETRO_ICONS.timer}
                alt=""
                width={15}
                height={15}
                className="pixel-art"
              />
            </span>
          </div>
          <p className="font-pixel text-3xl font-bold leading-none text-indigo-700 dark:text-indigo-300">
            {stats.interviewRate}%
          </p>
          <p className="text-[11.5px] text-muted">
            {stats.interviewed} masuk wawancara
          </p>
        </article>

        {/* 4. Rawan Ghosting */}
        <article
          className={`craft-card-flat p-4 flex flex-col justify-between gap-2.5 ${
            stats.ghostingRisk > 0
              ? "bg-danger-soft/75 border-danger/45"
              : "bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Rawan Ghosting
            </span>
            <span
              className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${
                stats.ghostingRisk > 0
                  ? "bg-surface border-danger/35"
                  : "bg-cream-soft border-line"
              }`}
            >
              <img
                src={RETRO_ICONS.ghost}
                alt=""
                width={15}
                height={15}
                className="pixel-art"
              />
            </span>
          </div>
          <p
            className={`font-pixel text-3xl font-bold leading-none ${
              stats.ghostingRisk > 0 ? "text-danger" : "text-ink"
            }`}
          >
            {stats.ghostingRisk}
          </p>
          <p className="text-[11.5px] text-muted">
            &gt; 14 hari tanpa kabar
            {stats.ghostedCount > 0 ? ` (${stats.ghostedCount} ghosted)` : ""}
          </p>
        </article>

        {/* 5. Offer Diterima */}
        <article
          className={`craft-card-flat p-4 flex flex-col justify-between gap-2.5 col-span-2 sm:col-span-1 ${
            stats.offers >= 2 ? "bg-leaf-soft border-leaf/55" : "bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Offer Diterima
            </span>
            <span className="w-7 h-7 rounded-xl bg-sky-soft border border-sky/80 flex items-center justify-center shrink-0">
              <img
                src={RETRO_ICONS.trophy}
                alt=""
                width={15}
                height={15}
                className="pixel-art"
              />
            </span>
          </div>
          <p className="font-pixel text-3xl font-bold leading-none text-leaf-deep">
            {stats.offers}
          </p>
          <p className="text-[11.5px] text-muted">
            {stats.offers >= 2
              ? "Siap dibandingkan!"
              : "Min. 2 untuk bandingkan"}
          </p>
        </article>
      </div>
    </section>
  );
}
