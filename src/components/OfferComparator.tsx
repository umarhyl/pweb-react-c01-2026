import { useMemo, useState } from "react";
import { ExternalLink, LayoutList } from "lucide-react";
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
      className={`craft-card p-6 flex flex-col justify-between gap-5 ${
        isRecommended
          ? "border-leaf ring-2 ring-leaf/20 bg-gradient-to-b from-surface to-leaf-soft/35"
          : ""
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-line">
          <div className="min-w-0 space-y-1">
            <span className="craft-eyebrow">{label}</span>
            <h3 className="font-pixel text-xl font-bold text-ink leading-snug">
              {item.application.company}
            </h3>
            <p className="text-xs text-muted">{item.application.role}</p>
            {item.application.jobUrl && (
              <a
                href={item.application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf hover:underline pt-0.5"
              >
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                Buka Web Asli
              </a>
            )}
          </div>

          {isRecommended && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-leaf-soft text-leaf-deep border border-leaf/50 shrink-0">
              <img
                src={RETRO_ICONS.trophy}
                alt=""
                width={14}
                height={14}
                className="pixel-art"
              />
              Rekomendasi Terbaik
            </span>
          )}

          {isTie && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-cream-soft text-ink border border-line-strong shrink-0">
              Skor Seimbang
            </span>
          )}
        </div>

        <dl className="divide-y divide-line text-xs">
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-muted">Uang Saku / Bulan</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-semibold text-ink">
                {formatRupiah(item.salary)}
              </span>
              <span className="font-mono font-semibold text-leaf-deep min-w-[70px]">
                {weightedSalary}{" "}
                <span className="font-normal text-muted">/ 50</span>
              </span>
            </dd>
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-muted">Mode Kerja</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-semibold text-ink">
                {item.application.workMode} ({item.workModeScore})
              </span>
              <span className="font-mono font-semibold text-leaf-deep min-w-[70px]">
                {weightedWorkMode}{" "}
                <span className="font-normal text-muted">/ 25</span>
              </span>
            </dd>
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-muted">Kecocokan Skill</dt>
            <dd className="flex items-center gap-3 text-right">
              <span className="font-semibold text-ink">
                {item.skillMatchScore}%
                {totalSkills > 0 && (
                  <span className="font-normal text-muted ml-1">
                    ({match.matchedSkills.length}/{totalSkills})
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold text-leaf-deep min-w-[70px]">
                {weightedSkill}{" "}
                <span className="font-normal text-muted">/ 25</span>
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
          isRecommended
            ? "bg-leaf-soft border-leaf/45"
            : "bg-cream-soft border-line"
        }`}
      >
        <span className="craft-eyebrow text-ink">Total Skor Berbobot</span>
        <span
          className={`font-pixel text-3xl font-bold leading-none ${
            isRecommended ? "text-leaf-deep" : "text-ink"
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
        className="craft-card p-10 text-center space-y-4"
        aria-label="Bandingkan Offer Magang"
      >
        <img
          src={RETRO_ICONS.comparator}
          alt=""
          width={38}
          height={38}
          className="pixel-art mx-auto"
        />
        <div className="space-y-1.5 max-w-md mx-auto">
          <span className="craft-eyebrow">
            Offer Comparator &middot; {offerApplications.length} / 2 Offer
          </span>
          <h2 className="font-pixel text-2xl font-bold text-ink">
            Belum cukup tawaran untuk dibandingkan
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Saat ini baru ada{" "}
            <strong className="text-ink">{offerApplications.length}</strong>{" "}
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
            className="craft-btn craft-btn-primary"
          >
            <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
            Buka War Room Pipeline
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Bandingkan Offer Magang">
      {/* Header & Selector Offer A vs Offer B */}
      <div className="craft-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="craft-eyebrow">
            Offer Comparator &middot; {offerApplications.length} Offer Tersedia
          </span>
          <h2 className="font-pixel text-xl font-bold text-ink flex items-center gap-2">
            <img
              src={RETRO_ICONS.comparator}
              alt=""
              width={18}
              height={18}
              className="pixel-art"
            />
            Bandingkan Offer Magang
          </h2>
          <p className="text-xs text-muted">
            Bobot: <strong>Uang Saku 50%</strong> &middot;{" "}
            <strong>Mode Kerja 25%</strong> (Remote 100, Hybrid 75, Onsite 50)
            &middot; <strong>Skill Match 25%</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="offer-a-select"
              className="text-xs font-semibold text-ink whitespace-nowrap"
            >
              Offer A:
            </label>
            <select
              id="offer-a-select"
              value={effectiveOfferA?.id ?? ""}
              onChange={(e) => handleSelectA(e.target.value)}
              className="craft-input text-xs min-w-[190px]"
            >
              {offerApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company} - {app.role}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-pixel font-bold text-wood text-center">
            vs
          </span>

          <div className="flex items-center gap-2">
            <label
              htmlFor="offer-b-select"
              className="text-xs font-semibold text-ink whitespace-nowrap"
            >
              Offer B:
            </label>
            <select
              id="offer-b-select"
              value={effectiveOfferB?.id ?? ""}
              onChange={(e) => handleSelectB(e.target.value)}
              className="craft-input text-xs min-w-[190px]"
            >
              {offerApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company} - {app.role}
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
