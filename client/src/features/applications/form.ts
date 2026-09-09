import { z } from 'zod';
import type { ApplicationInput } from '../../lib/api';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../../types';

export type ApplicationFormValues = {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt: string;
  jobUrl: string;
  location: string;
  source: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  description: string;
  followUpAt: string;
  resumeId: string;
};

export const applicationFormSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(120),
  status: z.enum(APPLICATION_STATUSES),
  appliedAt: z.string(),
  jobUrl: z.string(),
  location: z.string(),
  source: z.string(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  currency: z.string().min(3).max(3),
  description: z.string().max(5_000),
  followUpAt: z.string(),
  resumeId: z.string()
}).superRefine((value, context) => {
  if (value.jobUrl && !z.string().url().safeParse(value.jobUrl).success) {
    context.addIssue({ code: 'custom', path: ['jobUrl'], message: 'Use a complete URL, such as https://example.com.' });
  }
  if (value.salaryMin && Number.isNaN(Number(value.salaryMin))) {
    context.addIssue({ code: 'custom', path: ['salaryMin'], message: 'Enter a valid number.' });
  }
  if (value.salaryMax && Number.isNaN(Number(value.salaryMax))) {
    context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Enter a valid number.' });
  }
  if (value.salaryMin && value.salaryMax && Number(value.salaryMin) > Number(value.salaryMax)) {
    context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum must be greater than minimum.' });
  }
});

export function getApplicationFormDefaults(application?: Application): ApplicationFormValues {
  return {
    company: application?.company ?? '',
    role: application?.role ?? '',
    status: application?.status ?? 'SAVED',
    appliedAt: application?.appliedAt?.slice(0, 10) ?? '',
    jobUrl: application?.jobUrl ?? '',
    location: application?.location ?? '',
    source: application?.source ?? '',
    salaryMin: application?.salaryMin?.toString() ?? '',
    salaryMax: application?.salaryMax?.toString() ?? '',
    currency: application?.currency ?? 'USD',
    description: application?.description ?? '',
    followUpAt: application?.followUpAt?.slice(0, 10) ?? '',
    resumeId: application?.resumeId ?? ''
  };
}

export function toApplicationInput(values: ApplicationFormValues): ApplicationInput {
  const textOrNull = (value: string) => value.trim() || null;
  return {
    company: values.company.trim(),
    role: values.role.trim(),
    status: values.status,
    appliedAt: textOrNull(values.appliedAt),
    jobUrl: textOrNull(values.jobUrl),
    location: textOrNull(values.location),
    source: textOrNull(values.source),
    salaryMin: values.salaryMin ? Number(values.salaryMin) : null,
    salaryMax: values.salaryMax ? Number(values.salaryMax) : null,
    currency: values.currency.toUpperCase(),
    description: textOrNull(values.description),
    followUpAt: textOrNull(values.followUpAt),
    resumeId: values.resumeId || null
  };
}
