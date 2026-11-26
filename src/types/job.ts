export interface JobListing {
  id: number;
  title: string;
  company_name: string;
  category: string;
  candidate_required_location: string;
  salary: string;
  tags: string[];
  url?: string;
  description?: string;
  publication_date?: string;
}

export interface RemotiveApiResponse {
  jobs: JobListing[];
}

export type JobDataSource = "live" | "fallback";
