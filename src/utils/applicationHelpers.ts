import type { Application, WorkMode } from "../types";
import { calculateSkillMatch } from "./skillMatch";

export const GHOSTING_THRESHOLD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const WORK_MODE_SCORES: Readonly<Record<WorkMode, number>> = {
  Remote: 100,
  Hybrid: 75,
  Onsite: 50,
};

export interface OfferComparisonItem {
  application: Application;
  salary: number;
  normalizedSalaryScore: number;
  workModeScore: number;
  skillMatchScore: number;
  totalScore: number;
}

export interface OfferComparisonResult {
  offerA: OfferComparisonItem;
  offerB: OfferComparisonItem;
  recommendedId: string | null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateApplication(
  applications: readonly Application[],
  company: string,
  role: string,
): boolean {
  const normalizedCompany = normalizeText(company);
  const normalizedRole = normalizeText(role);

  if (normalizedCompany.length === 0 || normalizedRole.length === 0) {
    return false;
  }

  return applications.some(
    (app) =>
      normalizeText(app.company) === normalizedCompany &&
      normalizeText(app.role) === normalizedRole,
  );
}

export function getDaysSinceUpdate(
  lastUpdatedAt: string,
  now: Date = new Date(),
): number {
  const updatedMs = Date.parse(lastUpdatedAt);
  if (Number.isNaN(updatedMs)) return 0;

  const diffMs = now.getTime() - updatedMs;
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / MS_PER_DAY);
}

export function isGhostingRisk(
  application: Pick<Application, "status" | "lastUpdatedAt">,
  now: Date = new Date(),
): boolean {
  if (application.status !== "APPLIED" && application.status !== "SCREENING") {
    return false;
  }

  const updatedMs = Date.parse(application.lastUpdatedAt);
  if (Number.isNaN(updatedMs)) return false;

  return now.getTime() - updatedMs > GHOSTING_THRESHOLD_DAYS * MS_PER_DAY;
}

export function compareOffers(
  offerA: Application,
  offerB: Application,
  userSkills: readonly string[],
): OfferComparisonResult {
  const salaryA = Math.max(0, offerA.salaryOffer ?? 0);
  const salaryB = Math.max(0, offerB.salaryOffer ?? 0);
  const maxSalary = Math.max(salaryA, salaryB);

  const buildItem = (
    application: Application,
    salary: number,
  ): OfferComparisonItem => {
    const normalizedSalaryScore =
      maxSalary > 0 ? Math.round((salary / maxSalary) * 100) : 0;
    const workModeScore = WORK_MODE_SCORES[application.workMode];
    const skillMatchScore = calculateSkillMatch(
      userSkills,
      application.requiredSkills,
    ).score;

    const totalScore = Number(
      (
        normalizedSalaryScore * 0.5 +
        workModeScore * 0.25 +
        skillMatchScore * 0.25
      ).toFixed(1),
    );

    return {
      application,
      salary,
      normalizedSalaryScore,
      workModeScore,
      skillMatchScore,
      totalScore,
    };
  };

  const itemA = buildItem(offerA, salaryA);
  const itemB = buildItem(offerB, salaryB);

  let recommendedId: string | null = null;
  if (itemA.totalScore > itemB.totalScore) {
    recommendedId = itemA.application.id;
  } else if (itemB.totalScore > itemA.totalScore) {
    recommendedId = itemB.application.id;
  }

  return {
    offerA: itemA,
    offerB: itemB,
    recommendedId,
  };
}
