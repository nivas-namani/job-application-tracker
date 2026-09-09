import { ApplicationStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { asyncRoute, HttpError } from '../http.js';
import { prisma } from '../prisma.js';

const router = Router();
const dateValue = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime()]).nullable().optional();
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const baseInputSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.SAVED),
  appliedAt: dateValue, jobUrl: nullableText(2_048).refine((value) => !value || z.string().url().safeParse(value).success, 'Use a complete job URL.'),
  location: nullableText(160), source: nullableText(120), salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(), currency: z.string().trim().length(3).default('USD'),
  description: nullableText(5_000), followUpAt: dateValue, resumeId: z.string().cuid().nullable().optional()
});
const validateSalaryRange = (value: { salaryMin?: number | null; salaryMax?: number | null }, context: z.RefinementCtx) => {
  if (value.salaryMin !== null && value.salaryMin !== undefined && value.salaryMax !== null && value.salaryMax !== undefined && value.salaryMin > value.salaryMax) {
    context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum salary must be greater than minimum salary.' });
  }
};
const inputSchema = baseInputSchema.superRefine(validateSalaryRange);
const updateSchema = baseInputSchema.partial().superRefine((value, context) => {
  if (Object.keys(value).length === 0) context.addIssue({ code: 'custom', message: 'Provide at least one field to update.' });
  validateSalaryRange(value, context);
});

const include = {
  resume: { select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true } },
  statusHistory: { orderBy: { changedAt: 'desc' } }
} satisfies Prisma.ApplicationInclude;

type AppWithRelations = Prisma.ApplicationGetPayload<{ include: typeof include }>;
const serialize = (application: AppWithRelations) => application;
const asDate = (value: string | null | undefined) => value ? new Date(value) : value === null ? null : undefined;
const responseStatuses = new Set<ApplicationStatus>([ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER, ApplicationStatus.ACCEPTED]);

async function verifyResume(userId: string, resumeId: string | null | undefined) {
  if (!resumeId) return;
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new HttpError(400, 'Choose a resume from your own library.');
}

router.use(requireAuth);
router.get('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const applications = await prisma.application.findMany({ where: { userId: req.userId }, include, orderBy: { updatedAt: 'desc' } });
  res.json({ applications: applications.map(serialize) });
}));

router.post('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const input = inputSchema.parse(req.body); await verifyResume(req.userId!, input.resumeId);
  const application = await prisma.application.create({
    data: {
      ...input, appliedAt: asDate(input.appliedAt), followUpAt: asDate(input.followUpAt), currency: input.currency.toUpperCase(), userId: req.userId!,
      statusHistory: { create: { fromStatus: null, toStatus: input.status } }
    }, include
  });
  res.status(201).json({ application: serialize(application) });
}));

router.put('/:id', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const input = updateSchema.parse(req.body);
  const applicationId = String(req.params.id);
  const existing = await prisma.application.findFirst({ where: { id: applicationId, userId: req.userId! } });
  if (!existing) throw new HttpError(404, 'Application not found.');
  await verifyResume(req.userId!, input.resumeId);
  const nextStatus = input.status ?? existing.status;
  const statusChanged = input.status !== undefined && input.status !== existing.status;
  const application = await prisma.application.update({
    where: { id: existing.id },
    data: {
      ...input, appliedAt: input.appliedAt === undefined ? undefined : asDate(input.appliedAt), followUpAt: input.followUpAt === undefined ? undefined : asDate(input.followUpAt),
      currency: input.currency?.toUpperCase(),
      firstResponseAt: !existing.firstResponseAt && existing.status === ApplicationStatus.APPLIED && responseStatuses.has(nextStatus) ? new Date() : undefined,
      statusHistory: statusChanged ? { create: { fromStatus: existing.status, toStatus: nextStatus } } : undefined
    }, include
  });
  res.json({ application: serialize(application) });
}));

router.delete('/:id', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const applicationId = String(req.params.id);
  const existing = await prisma.application.findFirst({ where: { id: applicationId, userId: req.userId! }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Application not found.');
  await prisma.application.delete({ where: { id: existing.id } });
  res.status(204).end();
}));

export default router;
