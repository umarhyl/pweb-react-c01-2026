import type { JobDataSource, JobListing } from "../types";

export const REMOTIVE_API_URL =
  "https://remotive.com/api/remote-jobs?category=software-dev&limit=30";

export const FALLBACK_JOBS_URL = `${import.meta.env.BASE_URL}magang-fallback.json`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;|&ndash;/gi, "-");
}

function stripHtmlToStructuredText(raw: string): string {
  const withStructure = raw
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|section)>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ");

  const decoded = decodeHtmlEntities(withStructure);

  return decoded
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseJobListing(item: unknown): JobListing | null {
  if (!isRecord(item)) return null;

  const {
    id,
    title,
    company_name,
    category,
    candidate_required_location,
    salary,
    tags,
    url,
    description,
    publication_date,
  } = item;

  if (
    typeof id !== "number" ||
    typeof title !== "string" ||
    typeof company_name !== "string"
  ) {
    return null;
  }

  const normalizedTags = Array.isArray(tags)
    ? tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    : [];

  const cleanedDescription =
    typeof description === "string" && description.trim().length > 0
      ? stripHtmlToStructuredText(description)
      : undefined;

  return {
    id,
    title,
    company_name,
    category: typeof category === "string" ? category : "Uncategorized",
    candidate_required_location:
      typeof candidate_required_location === "string"
        ? candidate_required_location
        : "Remote",
    salary: typeof salary === "string" ? salary : "",
    tags: normalizedTags,
    url: typeof url === "string" && url.trim().length > 0 ? url : undefined,
    description: cleanedDescription,
    publication_date:
      typeof publication_date === "string" ? publication_date : undefined,
  };
}

function extractJobsPayload(data: unknown): JobListing[] {
  if (!isRecord(data) || !Array.isArray(data.jobs)) {
    throw new Error("Format respons data lowongan tidak valid.");
  }

  return data.jobs
    .map(parseJobListing)
    .filter((job): job is JobListing => job !== null);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchJobs(
  source: JobDataSource,
  signal?: AbortSignal,
): Promise<JobListing[]> {
  const endpoint = source === "live" ? REMOTIVE_API_URL : FALLBACK_JOBS_URL;

  const response = await fetch(endpoint, { signal });
  if (!response.ok) {
    throw new Error(
      `Gagal memuat lowongan dari ${source === "live" ? "Remotive API" : "dataset lokal"} (HTTP ${response.status}).`,
    );
  }

  const data: unknown = await response.json();
  return extractJobsPayload(data);
}
