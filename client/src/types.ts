export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'GHOSTED'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Resume {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export const HIRING_STAGE_KINDS = [
  'RECRUITER_SCREEN',
  'ONLINE_ASSESSMENT',
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'BEHAVIOURAL',
  'HIRING_MANAGER',
  'ONSITE',
  'TEAM_MATCH',
  'HR_DISCUSSION',
  'OFFER',
  'OTHER'
] as const;

export type HiringStageKind = (typeof HIRING_STAGE_KINDS)[number];

export interface HiringProcessStage {
  id: string;
  name: string;
  kind: HiringStageKind;
  position: number;
  typicalDurationDays: number | null;
  notes: string | null;
}

export interface HiringProcess {
  id: string;
  company: string;
  companyKey: string;
  notes: string | null;
  stages: HiringProcessStage[];
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  jobUrl: string | null;
  location: string | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string | null;
  followUpAt: string | null;
  firstResponseAt: string | null;
  archivedAt: string | null;
  resumeId: string | null;
  processStageId: string | null;
  resume: Resume | null;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export const statusMeta: Record<ApplicationStatus, { label: string; dot: string; pill: string }> = {
  SAVED: { label: 'Saved', dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-700' },
  APPLIED: { label: 'Applied', dot: 'bg-blue-600', pill: 'bg-blue-50 text-blue-700' },
  SCREENING: { label: 'Screening', dot: 'bg-teal-600', pill: 'bg-teal-50 text-teal-700' },
  INTERVIEW: { label: 'Interview', dot: 'bg-amber-600', pill: 'bg-amber-50 text-amber-800' },
  OFFER: { label: 'Offer', dot: 'bg-emerald-600', pill: 'bg-emerald-50 text-emerald-700' },
  ACCEPTED: { label: 'Accepted', dot: 'bg-emerald-700', pill: 'bg-emerald-50 text-emerald-800' },
  REJECTED: { label: 'Rejected', dot: 'bg-rose-600', pill: 'bg-rose-50 text-rose-700' },
  WITHDRAWN: { label: 'Withdrawn', dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-700' },
  GHOSTED: { label: 'Ghosted', dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-700' }
};

export const stageKindMeta: Record<HiringStageKind, { label: string; tint: string }> = {
  RECRUITER_SCREEN: { label: 'Recruiter screen', tint: 'bg-teal-50 text-teal-700' },
  ONLINE_ASSESSMENT: { label: 'Online assessment', tint: 'bg-indigo-50 text-indigo-700' },
  TECHNICAL: { label: 'Technical round', tint: 'bg-blue-50 text-blue-700' },
  SYSTEM_DESIGN: { label: 'System design', tint: 'bg-violet/10 text-violet' },
  BEHAVIOURAL: { label: 'Behavioural', tint: 'bg-amber-50 text-amber-800' },
  HIRING_MANAGER: { label: 'Hiring manager', tint: 'bg-orange-50 text-orange-700' },
  ONSITE: { label: 'Onsite loop', tint: 'bg-rose-50 text-rose-700' },
  TEAM_MATCH: { label: 'Team match', tint: 'bg-cyan-50 text-cyan-700' },
  HR_DISCUSSION: { label: 'HR discussion', tint: 'bg-slate-100 text-slate-700' },
  OFFER: { label: 'Offer', tint: 'bg-emerald-50 text-emerald-700' },
  OTHER: { label: 'Other', tint: 'bg-slate-100 text-slate-700' }
};

/**
 * Matches the server's key so a saved process lines up with an application's company
 * regardless of case, punctuation or a trailing "Inc."
 */
export function companyKeyFor(company: string) {
  const key = company.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|pvt|private|technologies|labs)\b/g, ' ')
    .replace(/\s+/g, '')
    .slice(0, 120);
  return key || company.toLowerCase().slice(0, 120);
}
