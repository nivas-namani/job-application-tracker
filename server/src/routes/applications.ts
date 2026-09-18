import { ApplicationStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { asyncRoute, HttpError } from '../http.js';
import { prisma } from '../prisma.js';
import { parseCsv, toCsv, toRecords } from '../services/csv.js';
import { parseJobLink } from '../services/job-link.js';

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
  description: nullableText(5_000), followUpAt: dateValue, resumeId: z.string().cuid().nullable().optional(),
  processStageId: z.string().cuid().nullable().optional()
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

/** A stage may only be attached when it belongs to one of the user's own process templates. */
async function verifyProcessStage(userId: string, stageId: string | null | undefined) {
  if (!stageId) return;
  const stage = await prisma.hiringProcessStage.findFirst({ where: { id: stageId, template: { userId } }, select: { id: true } });
  if (!stage) throw new HttpError(400, 'Choose a stage from your own hiring process.');
}

router.use(requireAuth);
router.get('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const includeArchived = req.query.archived === 'all';
  const applications = await prisma.application.findMany({
    where: { userId: req.userId, ...(includeArchived ? {} : { archivedAt: null }) },
    include, orderBy: { updatedAt: 'desc' }
  });
  res.json({ applications: applications.map(serialize) });
}));

/**
 * Reads a public job posting and returns the fields it could recognise.
 * Nothing is written here: the client decides which blanks to fill.
 */
const parseLinkSchema = z.object({ jobUrl: z.string().trim().min(1).max(2_048) });
const parseAttempts = new Map<string, number[]>();
const PARSE_WINDOW_MS = 60_000;
const PARSE_LIMIT = 12;

router.post('/parse-link', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const now = Date.now();
  const recent = (parseAttempts.get(req.userId!) ?? []).filter((stamp) => now - stamp < PARSE_WINDOW_MS);
  if (recent.length >= PARSE_LIMIT) throw new HttpError(429, 'Too many link lookups. Try again in a minute.');
  parseAttempts.set(req.userId!, [...recent, now]);

  const { jobUrl } = parseLinkSchema.parse(req.body);
  const withProtocol = /^https?:\/\//i.test(jobUrl) ? jobUrl : `https://${jobUrl}`;
  const result = await parseJobLink(withProtocol);
  res.json(result);
}));

const CSV_HEADERS = ['company', 'role', 'status', 'appliedAt', 'jobUrl', 'location', 'source', 'salaryMin', 'salaryMax', 'currency', 'followUpAt', 'description', 'archivedAt', 'createdAt'];

router.get('/export.csv', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const applications = await prisma.application.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
  const csv = toCsv(CSV_HEADERS, applications as unknown as Record<string, unknown>[]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="trackify-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}));

const IMPORT_LIMIT = 500;
const statusAliases = new Map<string, ApplicationStatus>(Object.values(ApplicationStatus).map((status) => [status.toLowerCase(), status]));
const readDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const readAmount = (value: string) => {
  const amount = Number(value.replace(/[^0-9.]/g, ''));
  return value && Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
};

const importSchema = z.object({ csv: z.string().min(1).max(2_000_000) });

router.post('/import', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { csv } = importSchema.parse(req.body);
  const records = toRecords(parseCsv(csv));
  if (!records.length) throw new HttpError(400, 'That file has no rows. Include a header row with at least company and role.');
  if (records.length > IMPORT_LIMIT) throw new HttpError(400, `Import up to ${IMPORT_LIMIT} rows at a time.`);

  const errors: { row: number; message: string }[] = [];
  const rowsToCreate: Prisma.ApplicationCreateManyInput[] = [];

  records.forEach((record, index) => {
    const company = (record.company ?? '').slice(0, 120);
    const role = (record.role ?? record.position ?? record.title ?? '').slice(0, 120);
    if (!company || !role) { errors.push({ row: index + 2, message: 'Company and role are both required.' }); return; }
    const status = statusAliases.get((record.status ?? '').toLowerCase()) ?? ApplicationStatus.SAVED;
    const currency = (record.currency ?? '').trim().toUpperCase();
    rowsToCreate.push({
      userId: req.userId!, company, role, status,
      appliedAt: readDate(record.appliedat ?? ''), followUpAt: readDate(record.followupat ?? ''),
      jobUrl: z.string().url().safeParse(record.joburl).success ? record.joburl.slice(0, 2_048) : null,
      location: (record.location || null) && record.location.slice(0, 160),
      source: (record.source || null) && record.source.slice(0, 120),
      salaryMin: readAmount(record.salarymin ?? ''), salaryMax: readAmount(record.salarymax ?? ''),
      currency: currency.length === 3 ? currency : 'USD',
      description: (record.description || record.notes || null) && (record.description || record.notes).slice(0, 5_000),
      archivedAt: readDate(record.archivedat ?? '')
    });
  });

  if (rowsToCreate.length) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const row of rowsToCreate) {
        const created = await tx.application.create({ data: row, select: { id: true, status: true } });
        await tx.applicationStatusHistory.create({ data: { applicationId: created.id, fromStatus: null, toStatus: created.status } });
      }
    });
  }

  res.status(201).json({ imported: rowsToCreate.length, skipped: errors.length, errors: errors.slice(0, 20) });
}));

router.post('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const input = inputSchema.parse(req.body);
  await verifyResume(req.userId!, input.resumeId);
  await verifyProcessStage(req.userId!, input.processStageId);
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
  await verifyProcessStage(req.userId!, input.processStageId);
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

/** Archiving keeps the record and its history but takes it off the working board. */
router.post('/:id/archive', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const archived = z.object({ archived: z.boolean().default(true) }).parse(req.body ?? {});
  const applicationId = String(req.params.id);
  const existing = await prisma.application.findFirst({ where: { id: applicationId, userId: req.userId! }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Application not found.');
  const application = await prisma.application.update({ where: { id: existing.id }, data: { archivedAt: archived.archived ? new Date() : null }, include });
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
