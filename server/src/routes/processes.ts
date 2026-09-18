import { HiringStageKind, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { asyncRoute, HttpError } from '../http.js';
import { prisma } from '../prisma.js';

const router = Router();

/**
 * Templates are matched to applications by company name, so the key ignores case,
 * punctuation and the usual legal suffixes: "Acme Inc." and "acme" are the same employer.
 */
export function companyKeyFor(company: string) {
  return company.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|pvt|private|technologies|labs)\b/g, ' ')
    .replace(/\s+/g, '')
    .slice(0, 120) || company.toLowerCase().slice(0, 120);
}

const stageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.nativeEnum(HiringStageKind).default(HiringStageKind.OTHER),
  typicalDurationDays: z.number().int().min(0).max(365).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional()
});
const templateSchema = z.object({
  company: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2_000).nullable().optional(),
  stages: z.array(stageSchema).min(1, 'Add at least one stage.').max(20)
});

const include = { stages: { orderBy: { position: 'asc' } } } satisfies Prisma.HiringProcessTemplateInclude;

router.use(requireAuth);

router.get('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const processes = await prisma.hiringProcessTemplate.findMany({ where: { userId: req.userId }, include, orderBy: { company: 'asc' } });
  res.json({ processes });
}));

router.post('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const input = templateSchema.parse(req.body);
  const companyKey = companyKeyFor(input.company);
  const duplicate = await prisma.hiringProcessTemplate.findUnique({ where: { userId_companyKey: { userId: req.userId!, companyKey } }, select: { id: true } });
  if (duplicate) throw new HttpError(409, `You already saved a hiring process for ${input.company}. Edit that one instead.`);
  const process = await prisma.hiringProcessTemplate.create({
    data: {
      userId: req.userId!, company: input.company, companyKey, notes: input.notes ?? null,
      stages: { create: input.stages.map((stage, position) => ({ ...stage, notes: stage.notes ?? null, typicalDurationDays: stage.typicalDurationDays ?? null, position })) }
    }, include
  });
  res.status(201).json({ process });
}));

/** Stages are replaced wholesale, which keeps ordering simple and matches how the editor works. */
router.put('/:id', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const input = templateSchema.parse(req.body);
  const templateId = String(req.params.id);
  const existing = await prisma.hiringProcessTemplate.findFirst({ where: { id: templateId, userId: req.userId! }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Hiring process not found.');
  const companyKey = companyKeyFor(input.company);
  const clash = await prisma.hiringProcessTemplate.findUnique({ where: { userId_companyKey: { userId: req.userId!, companyKey } }, select: { id: true } });
  if (clash && clash.id !== existing.id) throw new HttpError(409, `You already saved a hiring process for ${input.company}.`);

  const process = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.hiringProcessStage.deleteMany({ where: { templateId: existing.id } });
    return tx.hiringProcessTemplate.update({
      where: { id: existing.id },
      data: {
        company: input.company, companyKey, notes: input.notes ?? null,
        stages: { create: input.stages.map((stage, position) => ({ ...stage, notes: stage.notes ?? null, typicalDurationDays: stage.typicalDurationDays ?? null, position })) }
      }, include
    });
  });
  res.json({ process });
}));

router.delete('/:id', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const templateId = String(req.params.id);
  const existing = await prisma.hiringProcessTemplate.findFirst({ where: { id: templateId, userId: req.userId! }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Hiring process not found.');
  await prisma.hiringProcessTemplate.delete({ where: { id: existing.id } });
  res.status(204).end();
}));

export default router;
