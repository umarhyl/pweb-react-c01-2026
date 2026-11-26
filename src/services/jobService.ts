import type { JobDataSource, JobListing } from "../types";

export const REMOTIVE_API_URL =
  "https://remotive.com/api/remote-jobs?category=software-dev&limit=30";

export const FALLBACK_JOBS_URL = `${import.meta.env.BASE_URL}magang-fallback.json`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripHtmlToPlainText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
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
      ? stripHtmlToPlainText(description)
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
