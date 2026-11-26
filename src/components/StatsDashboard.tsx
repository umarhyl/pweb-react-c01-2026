import { useMemo } from "react";
import {
  Award,
  Briefcase,
  Ghost,
  MessageSquareCheck,
  TrendingUp,
} from "lucide-react";
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Total Lamaran */}
        <article className="xp-paper p-3 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
            <span>Total Lamaran</span>
            <Briefcase className="w-3.5 h-3.5 text-xp-deep shrink-0" aria-hidden="true" />
          </div>
          <p className="font-mono text-2xl font-bold text-xp-deep leading-tight">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.activeInPipeline} aktif di pipeline
          </p>
        </article>

        {/* 2. Response Rate % */}
        <article className="xp-paper p-3 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
            <span>Response Rate</span>
            <MessageSquareCheck
              className="w-3.5 h-3.5 text-xp-bar shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono text-2xl font-bold text-xp-bar leading-tight">
            {stats.responseRate}%
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.responded} dari {stats.total} diproses
          </p>
        </article>

        {/* 3. Interview Rate % */}
        <article className="xp-paper p-3 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
            <span>Interview Rate</span>
            <TrendingUp
              className="w-3.5 h-3.5 text-indigo-700 shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono text-2xl font-bold text-indigo-800 leading-tight">
            {stats.interviewRate}%
          </p>
          <p className="text-[11px] text-slate-600">
            {stats.interviewed} masuk wawancara
          </p>
        </article>

        {/* 4. Rawan Ghosting */}
        <article
          className={`xp-paper p-3 flex flex-col justify-between gap-1 ${
            stats.ghostingRisk > 0 ? "bg-red-50/70 border-xp-danger" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
            <span>Rawan Ghosting</span>
            <Ghost
              className="w-3.5 h-3.5 text-xp-danger shrink-0"
              aria-hidden="true"
            />
          </div>
          <p
            className={`font-mono text-2xl font-bold leading-tight ${
              stats.ghostingRisk > 0 ? "text-xp-danger" : "text-slate-700"
            }`}
          >
            {stats.ghostingRisk}
          </p>
          <p className="text-[11px] text-slate-600">&gt; 14 hari tanpa kabar</p>
        </article>

        {/* 5. Total Offer */}
        <article
          className={`xp-paper p-3 flex flex-col justify-between gap-1 col-span-2 sm:col-span-1 ${
            stats.offers >= 2 ? "bg-emerald-50/70 border-xp-green" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
            <span>Offer Diterima</span>
            <Award
              className="w-3.5 h-3.5 text-xp-green shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono text-2xl font-bold text-xp-green leading-tight">
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
