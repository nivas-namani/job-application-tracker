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
  resumeId: string | null;
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
