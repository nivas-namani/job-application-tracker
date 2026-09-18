import { describe, expect, it } from 'vitest';
import { getMetrics, isClosed } from './application-utils';
import type { Application } from '../types';

const base = (overrides: Partial<Application>): Application => ({
  id: 'application-1', company: 'Acme', role: 'Engineer', status: 'APPLIED', appliedAt: '2026-08-01T00:00:00.000Z',
  jobUrl: null, location: null, source: null, salaryMin: null, salaryMax: null, currency: 'USD', description: null,
  followUpAt: null, firstResponseAt: null, archivedAt: null, resumeId: null, processStageId: null, resume: null, statusHistory: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides
});

describe('application metrics', () => {
  it('counts active applications, response rate, median response time and overdue follow-ups', () => {
    const metrics = getMetrics([
      base({ firstResponseAt: '2026-08-05T00:00:00.000Z', status: 'SCREENING' }),
      base({ id: 'application-2', status: 'REJECTED', firstResponseAt: '2026-08-09T00:00:00.000Z' }),
      base({ id: 'application-3', appliedAt: '2026-08-20T00:00:00.000Z' })
    ], new Date('2026-09-10T00:00:00.000Z'));

    expect(metrics).toMatchObject({ active: 2, responseRate: 67, medianReplyDays: 6, needsFollowUp: 1 });
  });

  it('recognises closed statuses', () => {
    expect(isClosed('OFFER')).toBe(false);
    expect(isClosed('WITHDRAWN')).toBe(true);
  });
});
