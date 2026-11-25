export type MatchLevel = "high" | "medium" | "low";

export interface SkillMatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  level: MatchLevel;
}

export function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function hasDuplicateSkill(
  skills: readonly string[],
  candidate: string,
): boolean {
  const normalizedCandidate = normalizeSkill(candidate);
  if (normalizedCandidate.length === 0) return false;
  return skills.some((skill) => normalizeSkill(skill) === normalizedCandidate);
}

export function getMatchLevel(score: number): MatchLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function calculateSkillMatch(
  userSkills: readonly string[],
  requiredSkills: readonly string[],
): SkillMatchResult {
  const userSkillSet = new Set(
    userSkills
      .map(normalizeSkill)
      .filter((skill) => skill.length > 0),
  );

  const uniqueRequired: string[] = [];
  const seenRequired = new Set<string>();

  for (const rawSkill of requiredSkills) {
    const trimmed = rawSkill.trim();
    const normalized = trimmed.toLowerCase();
    if (normalized.length > 0 && !seenRequired.has(normalized)) {
      seenRequired.add(normalized);
      uniqueRequired.push(trimmed);
    }
  }

  if (uniqueRequired.length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      level: "low",
    };
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of uniqueRequired) {
    if (userSkillSet.has(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const score = Math.round(
    (matchedSkills.length / uniqueRequired.length) * 100,
  );

  return {
    score,
    matchedSkills,
    missingSkills,
    level: getMatchLevel(score),
  };
}
