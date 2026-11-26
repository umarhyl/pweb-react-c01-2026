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
      offers,
      responseRate,
      interviewRate,
    };
  }, [applications]);

  return (
    <section aria-label="Ringkasan Statistik Lamaran">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Lamaran */}
        <article className="xp-paper p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">Total Lamaran</span>
            <img
              src={RETRO_ICONS.briefcase}
              alt=""
              width={16}
              height={16}
              className="xp-pixel shrink-0"
            />
          </div>
          <p className="font-retro text-4xl leading-none text-xp-deep">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.activeInPipeline} aktif di pipeline
          </p>
        </article>

        {/* 2. Response Rate % */}
        <article className="xp-paper p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">Response Rate</span>
            <img
              src={RETRO_ICONS.stats}
              alt=""
              width={16}
              height={16}
              className="xp-pixel shrink-0"
            />
          </div>
          <p className="font-retro text-4xl leading-none text-xp-bar">
            {stats.responseRate}%
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.responded} dari {stats.total} diproses
          </p>
        </article>

        {/* 3. Interview Rate % */}
        <article className="xp-paper p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">Interview Rate</span>
            <img
              src={RETRO_ICONS.timer}
              alt=""
              width={16}
              height={16}
              className="xp-pixel shrink-0"
            />
          </div>
          <p className="font-retro text-4xl leading-none text-indigo-800">
            {stats.interviewRate}%
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.interviewed} masuk wawancara
          </p>
        </article>

        {/* 4. Rawan Ghosting */}
        <article
          className={`xp-paper p-4 flex flex-col justify-between gap-2 ${
            stats.ghostingRisk > 0 ? "bg-red-50/75 !border-xp-danger" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">Rawan Ghosting</span>
            <img
              src={RETRO_ICONS.ghost}
              alt=""
              width={16}
              height={16}
              className="xp-pixel shrink-0"
            />
          </div>
          <p
            className={`font-retro text-4xl leading-none ${
              stats.ghostingRisk > 0 ? "text-xp-danger" : "text-slate-700"
            }`}
          >
            {stats.ghostingRisk}
          </p>
          <p className="text-[11px] text-slate-600">&gt; 14 hari tanpa kabar</p>
        </article>

        {/* 5. Offer Diterima */}
        <article
          className={`xp-paper p-4 flex flex-col justify-between gap-2 col-span-2 sm:col-span-1 ${
            stats.offers >= 2 ? "bg-emerald-50/70 !border-xp-green" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">Offer Diterima</span>
            <img
              src={RETRO_ICONS.trophy}
              alt=""
              width={16}
              height={16}
              className="xp-pixel shrink-0"
            />
          </div>
          <p className="font-retro text-4xl leading-none text-xp-green">
            {stats.offers}
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.offers >= 2
              ? "Siap dibandingkan"
              : "Butuh min. 2 untuk bandingkan"}
          </p>
        </article>
      </div>
    </section>
  );
}
