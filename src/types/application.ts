export type WorkMode = "Remote" | "Hybrid" | "Onsite";

export type ApplicationStatus =
  | "WISHLIST"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "GHOSTED";

export type InitialApplicationStatus = Extract<
  ApplicationStatus,
  "WISHLIST" | "APPLIED"
>;

export type ApplicationSortBy =
  | "newest"
  | "interviewSoonest"
  | "highestOffer";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  workMode: WorkMode;
  status: ApplicationStatus;
  requiredSkills: string[];
  cvVersion?: string;
  appliedDate?: string;
  interviewDateTime?: string;
  salaryOffer?: number;
  lastUpdatedAt: string;
  checklist: ChecklistItem[];
  activityLogs: ActivityLog[];
}

export interface StatusTransitionPayload {
  cvVersion?: string;
  appliedDate?: string;
  interviewDateTime?: string;
  salaryOffer?: number;
  workMode?: WorkMode;
}

export interface TransitionValidationResult {
  valid: boolean;
  errors: string[];
}
