import { useMemo, useState } from "react";
import {
  Award,
  Briefcase,
  CheckCircle2,
  LayoutList,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Application } from "../types";
import { calculateSkillMatch, compareOffers } from "../utils";
import type { OfferComparisonItem } from "../utils";

interface OfferComparatorProps {
  applications: readonly Application[];
  userSkills: readonly string[];
  onOpenPipeline?: () => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface OfferCardProps {
  label: "Offer A" | "Offer B";
  item: OfferComparisonItem;
  userSkills: readonly string[];
  isRecommended: boolean;
  isTie: boolean;
}

function OfferComparisonCard({
  label,
  item,
  userSkills,
  isRecommended,
  isTie,
}: OfferCardProps) {
  const match = calculateSkillMatch(userSkills, item.application.requiredSkills);
  const totalSkills = match.matchedSkills.length + match.missingSkills.length;
  const weightedSalary = (item.normalizedSalaryScore * 0.5).toFixed(1);
  const weightedWorkMode = (item.workModeScore * 0.25).toFixed(1);
  const weightedSkill = (item.skillMatchScore * 0.25).toFixed(1);

  return (
    <article
      className={`xp-window flex flex-col justify-between ${
        isRecommended ? "ring-2 ring-xp-green shadow-md" : ""
      }`}
    >
      <div className="xp-titlebar">
        <span className="truncate">
          {label} — {item.application.company}
        </span>
        {isRecommended && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-xp-green text-white border border-white/60 rounded-xs shrink-0">
            <Award className="w-3 h-3" aria-hidden="true" />
            Rekomendasi Terbaik
          </span>
        )}
        {isTie && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-xp-warn text-xp-ink border border-xp-ink rounded-xs shrink-0">
            Skor Seimbang
          </span>
        )}
      </div>

      <div className="p-4 bg-xp-paper space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-xp-cream-border">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold text-xp-deep leading-snug">
                {item.application.company}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {item.application.role}
              </p>
            </div>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-xp-green rounded-xs shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Terbaik
              </span>
            )}
          </div>

          <dl className="divide-y divide-xp-cream-border text-xs">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-slate-600 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-xp-deep" aria-hidden="true" />
                Uang Saku / Bulan
              </dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-bold text-xp-ink">
                  {formatRupiah(item.salary)}
                </span>
                <span className="font-mono font-bold text-xp-deep min-w-[72px]">
                  {weightedSalary}{" "}
                  <span className="font-normal text-slate-500">/ 50</span>
                </span>
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-slate-600 flex items-center gap-1.5">
                <Briefcase
                  className="w-3.5 h-3.5 text-xp-deep"
                  aria-hidden="true"
                />
                Mode Kerja
              </dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-bold text-xp-ink">
                  {item.application.workMode} ({item.workModeScore})
                </span>
                <span className="font-mono font-bold text-xp-deep min-w-[72px]">
                  {weightedWorkMode}{" "}
                  <span className="font-normal text-slate-500">/ 25</span>
                </span>
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-slate-600 flex items-center gap-1.5">
                <Sparkles
                  className="w-3.5 h-3.5 text-xp-deep"
                  aria-hidden="true"
                />
                Kecocokan Skill
              </dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-bold text-xp-ink">
                  {item.skillMatchScore}%
                  {totalSkills > 0 && (
                    <span className="font-normal text-slate-500 ml-1">
                      ({match.matchedSkills.length}/{totalSkills} skill)
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-xp-deep min-w-[72px]">
                  {weightedSkill}{" "}
                  <span className="font-normal text-slate-500">/ 25</span>
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div
          className={`p-3 border flex items-center justify-between gap-3 ${
            isRecommended
              ? "xp-grid-bg border-xp-deep"
              : "bg-xp-cream/70 border-xp-border"
          }`}
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-xp-deep">
            Total Skor Berbobot
          </span>
          <span
            className={`font-mono text-2xl font-bold ${
              isRecommended ? "text-xp-green" : "text-xp-ink"
            }`}
          >
            {item.totalScore.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function OfferComparator({
  applications,
  userSkills,
  onOpenPipeline,
}: OfferComparatorProps) {
  const offerApplications = useMemo(
    () => applications.filter((app) => app.status === "OFFER"),
    [applications],
  );

  const [selectedAId, setSelectedAId] = useState<string>("");
  const [selectedBId, setSelectedBId] = useState<string>("");

  const effectiveOfferA = useMemo(() => {
    if (offerApplications.length < 2) return null;
    return (
      offerApplications.find((app) => app.id === selectedAId) ??
      offerApplications[0]
    );
  }, [offerApplications, selectedAId]);

  const effectiveOfferB = useMemo(() => {
    if (offerApplications.length < 2 || !effectiveOfferA) return null;
    const candidate = offerApplications.find(
      (app) => app.id === selectedBId && app.id !== effectiveOfferA.id,
    );
    return (
      candidate ??
      offerApplications.find((app) => app.id !== effectiveOfferA.id) ??
      null
    );
  }, [offerApplications, selectedBId, effectiveOfferA]);

  const comparison = useMemo(() => {
    if (!effectiveOfferA || !effectiveOfferB) return null;
    return compareOffers(effectiveOfferA, effectiveOfferB, userSkills);
  }, [effectiveOfferA, effectiveOfferB, userSkills]);

  const handleSelectA = (nextId: string) => {
    if (effectiveOfferB && nextId === effectiveOfferB.id && effectiveOfferA) {
      setSelectedBId(effectiveOfferA.id);
    }
    setSelectedAId(nextId);
  };

  const handleSelectB = (nextId: string) => {
    if (effectiveOfferA && nextId === effectiveOfferA.id && effectiveOfferB) {
      setSelectedAId(effectiveOfferB.id);
    }
    setSelectedBId(nextId);
  };

  if (offerApplications.length < 2) {
    return (
      <section className="xp-window" aria-label="Bandingkan Offer Magang">
        <div className="xp-titlebar">
          <span className="inline-flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            Offer Comparator
          </span>
          <span className="font-mono text-[11px] bg-xp-deep/70 px-1.5 py-0.5 rounded-sm">
            {offerApplications.length} / 2 offer
          </span>
        </div>

        <div className="p-8 bg-xp-paper text-center space-y-3">
          <Scale
            className="w-9 h-9 text-xp-border mx-auto"
            aria-hidden="true"
          />
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-lg font-bold text-xp-deep">
              Belum cukup tawaran untuk dibandingkan
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Saat ini baru ada{" "}
              <strong className="font-mono text-xp-ink">
                {offerApplications.length}
              </strong>{" "}
              lamaran berstatus <strong>OFFER</strong>. Pindahkan minimal{" "}
              <strong>2 lamaran</strong> ke tahap <strong>OFFER</strong> di War
              Room Pipeline (lengkap dengan nominal gaji &amp; mode kerja) untuk
              memulai perbandingan objektif.
            </p>
          </div>

          {onOpenPipeline && (
            <button
              type="button"
              onClick={onOpenPipeline}
              className="xp-btn xp-btn-green"
            >
              <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
              Buka Pipeline Lamaran
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Bandingkan Offer Magang">
      {/* Header & Dropdown Pilihan Offer A vs Offer B */}
      <div className="xp-window">
        <div className="xp-titlebar">
          <span className="inline-flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            Bandingkan Offer Magang
          </span>
          <span className="font-mono text-[11px] bg-xp-deep/70 px-1.5 py-0.5 rounded-sm">
            {offerApplications.length} offer tersedia
          </span>
        </div>

        <div className="p-3.5 bg-xp-paper flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-xp-deep">
              Analisis Objektif Tawaran Magang
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Bobot penilaian: <strong>Uang Saku 50%</strong> &middot;{" "}
              <strong>Mode Kerja 25%</strong> (Remote 100, Hybrid 75, Onsite 50)
              &middot; <strong>Kecocokan Skill 25%</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="offer-a-select"
                className="text-xs font-bold text-xp-deep whitespace-nowrap"
              >
                Offer A:
              </label>
              <select
                id="offer-a-select"
                value={effectiveOfferA?.id ?? ""}
                onChange={(e) => handleSelectA(e.target.value)}
                className="xp-input text-xs min-w-[190px]"
              >
                {offerApplications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-mono font-bold text-slate-500 text-center">
              vs
            </span>

            <div className="flex items-center gap-1.5">
              <label
                htmlFor="offer-b-select"
                className="text-xs font-bold text-xp-deep whitespace-nowrap"
              >
                Offer B:
              </label>
              <select
                id="offer-b-select"
                value={effectiveOfferB?.id ?? ""}
                onChange={(e) => handleSelectB(e.target.value)}
                className="xp-input text-xs min-w-[190px]"
              >
                {offerApplications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Kartu Perbandingan */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OfferComparisonCard
            label="Offer A"
            item={comparison.offerA}
            userSkills={userSkills}
            isRecommended={
              comparison.recommendedId === comparison.offerA.application.id
            }
            isTie={comparison.recommendedId === null}
          />
          <OfferComparisonCard
            label="Offer B"
            item={comparison.offerB}
            userSkills={userSkills}
            isRecommended={
              comparison.recommendedId === comparison.offerB.application.id
            }
            isTie={comparison.recommendedId === null}
          />
        </div>
      )}
    </section>
  );
}
