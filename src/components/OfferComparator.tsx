import { useMemo, useState } from "react";
import { LayoutList } from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
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
      className={`xp-paper p-6 flex flex-col justify-between gap-5 ${
        isRecommended
          ? "!border-2 !border-xp-green shadow-[5px_5px_0_#267c08]"
          : ""
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-xp-cream-border">
          <div className="min-w-0 space-y-1">
            <span className="xp-eyebrow">{label}</span>
            <h3 className="font-display text-xl font-bold text-xp-deep leading-snug">
              {item.application.company}
            </h3>
            <p className="text-xs text-slate-600">{item.application.role}</p>
          </div>

          {isRecommended && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-xp-warn text-xp-deep border border-xp-ink shrink-0">
              <img
                src={RETRO_ICONS.trophy}
                alt=""
                width={14}
                height={14}
                className="xp-pixel"
              />
              Rekomendasi Terbaik
            </span>
          )}

          {isTie && (
            <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold bg-xp-cream text-xp-ink border border-xp-ink shrink-0">
              Skor Seimbang
            </span>
          )}
        </div>

        <dl className="divide-y divide-xp-cream-border text-xs">
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-slate-600">Uang Saku / Bulan</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-bold text-xp-ink">
                {formatRupiah(item.salary)}
              </span>
              <span className="font-mono font-bold text-xp-deep min-w-[70px]">
                {weightedSalary}{" "}
                <span className="font-normal text-slate-500">/ 50</span>
              </span>
            </dd>
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-slate-600">Mode Kerja</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-bold text-xp-ink">
                {item.application.workMode} ({item.workModeScore})
              </span>
              <span className="font-mono font-bold text-xp-deep min-w-[70px]">
                {weightedWorkMode}{" "}
                <span className="font-normal text-slate-500">/ 25</span>
              </span>
            </dd>
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-slate-600">Kecocokan Skill</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-bold text-xp-ink">
                {item.skillMatchScore}%
                {totalSkills > 0 && (
                  <span className="font-normal text-slate-500 ml-1">
                    ({match.matchedSkills.length}/{totalSkills})
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-xp-deep min-w-[70px]">
                {weightedSkill}{" "}
                <span className="font-normal text-slate-500">/ 25</span>
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`p-4 border flex items-center justify-between gap-3 ${
          isRecommended
            ? "xp-grid-bg border-xp-deep"
            : "xp-card-soft border-xp-cream-border"
        }`}
      >
        <span className="xp-eyebrow text-xp-deep">Total Skor Berbobot</span>
        <span
          className={`font-retro text-4xl leading-none ${
            isRecommended ? "text-xp-green" : "text-xp-ink"
          }`}
        >
          {item.totalScore.toFixed(1)}
        </span>
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
      <section
        className="xp-paper p-10 text-center space-y-4"
        aria-label="Bandingkan Offer Magang"
      >
        <img
          src={RETRO_ICONS.comparator}
          alt=""
          width={36}
          height={36}
          className="xp-pixel mx-auto"
        />
        <div className="space-y-1.5 max-w-md mx-auto">
          <span className="xp-eyebrow">
            OFFER_COMPARATOR.XLS &middot; {offerApplications.length} / 2 OFFER
          </span>
          <h2 className="font-display text-xl font-bold text-xp-deep">
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
            mulai membandingkan.
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
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label="Bandingkan Offer Magang">
      {/* Header & Selector Offer A vs Offer B */}
      <div className="xp-paper p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="xp-eyebrow">
            OFFER_COMPARATOR.XLS &middot; {offerApplications.length} OFFER
            TERSEDIA
          </span>
          <h2 className="font-display text-xl font-bold text-xp-deep flex items-center gap-2">
            <img
              src={RETRO_ICONS.comparator}
              alt=""
              width={18}
              height={18}
              className="xp-pixel"
            />
            Bandingkan Offer Magang
          </h2>
          <p className="text-xs text-slate-600">
            Bobot: <strong>Uang Saku 50%</strong> &middot;{" "}
            <strong>Mode Kerja 25%</strong> (Remote 100, Hybrid 75, Onsite 50)
            &middot; <strong>Skill Match 25%</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
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

      {/* 2 Kartu Perbandingan */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
