import type { Application, ApplicationStatus } from '../types';

const closedStatuses = new Set<ApplicationStatus>(['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED']);
const responseStatuses = new Set<ApplicationStatus>(['SCREENING', 'INTERVIEW', 'OFFER', 'ACCEPTED']);

export const isClosed = (status: ApplicationStatus) => closedStatuses.has(status);

/** Screening onward is when the employer's rounds actually matter, so the drawer leads with them. */
export const isProcessRelevant = (application: Application) =>
  application.status === 'SCREENING' || application.status === 'INTERVIEW' || application.status === 'OFFER';

export function getMetrics(applications: Application[], now = new Date()) {
  const active = applications.filter((application) => !isClosed(application.status));
  const applied = applications.filter((application) => application.appliedAt);
  const replied = applied.filter(
    (application) => application.firstResponseAt || responseStatuses.has(application.status)
  );
  const replyDays = replied.flatMap((application) => {
    if (!application.appliedAt || !application.firstResponseAt) return [];
    return [(new Date(application.firstResponseAt).getTime() - new Date(application.appliedAt).getTime()) / 86_400_000];
  }).sort((a, b) => a - b);
  const midpoint = Math.floor(replyDays.length / 2);
  const medianReplyDays = replyDays.length
    ? Math.round(replyDays.length % 2 ? replyDays[midpoint] : (replyDays[midpoint - 1] + replyDays[midpoint]) / 2)
    : null;
  const needsFollowUp = active.filter((application) => {
    if (application.followUpAt) return new Date(application.followUpAt) < now;
    if (!application.appliedAt || application.status !== 'APPLIED') return false;
    return now.getTime() - new Date(application.appliedAt).getTime() >= 14 * 86_400_000;
  }).length;

  return {
    total: applications.length,
    active: active.length,
    responseRate: applied.length ? Math.round((replied.length / applied.length) * 100) : 0,
    replied: replied.length,
    applied: applied.length,
    medianReplyDays,
    needsFollowUp
  };
}

export function displayDate(date: string | null, fallback = 'Not set') {
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function displayMoney(value: number | null, currency = 'USD') {
  if (value === null) return null;
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
