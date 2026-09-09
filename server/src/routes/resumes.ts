import { Prisma } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { asyncRoute, HttpError } from '../http.js';
import { prisma } from '../prisma.js';
import { buildStorageKey, getDownloadUrl, getLocalFilePath, removeFile, storeFile } from '../storage.js';

const router = Router();
const allowedMimeTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype)) });
const serialize = (resume: { id: string; fileName: string; mimeType: string; size: number; createdAt: Date }) => resume;

router.use(requireAuth);
router.get('/', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const resumes = await prisma.resume.findMany({ where: { userId: req.userId }, select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ resumes: resumes.map(serialize) });
}));

router.post('/', upload.single('resume'), asyncRoute(async (req: AuthenticatedRequest, res) => {
  if (!req.file) throw new HttpError(400, 'Upload a PDF, DOC, or DOCX file up to 5 MB.');
  const applicationId = typeof req.body.applicationId === 'string' ? req.body.applicationId : undefined;
  if (applicationId) {
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: req.userId! }, select: { id: true } });
    if (!application) throw new HttpError(404, 'Application not found.');
  }
  const storageKey = buildStorageKey(req.userId!, req.file.originalname);
  await storeFile(storageKey, req.file);
  try {
    const resume = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.resume.create({ data: { userId: req.userId!, storageKey, fileName: req.file!.originalname, mimeType: req.file!.mimetype, size: req.file!.size } });
      if (applicationId) await tx.application.update({ where: { id: applicationId }, data: { resumeId: created.id } });
      return created;
    });
    res.status(201).json({ resume: serialize(resume) });
  } catch (error) { await removeFile(storageKey); throw error; }
}));

router.get('/:id/download', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const resumeId = String(req.params.id);
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: req.userId! } });
  if (!resume) throw new HttpError(404, 'Resume not found.');
  const signedUrl = await getDownloadUrl(resume.storageKey);
  if (signedUrl) return res.redirect(signedUrl);
  return res.download(getLocalFilePath(resume.storageKey), resume.fileName);
}));

router.delete('/:id', asyncRoute(async (req: AuthenticatedRequest, res) => {
  const resumeId = String(req.params.id);
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: req.userId! } });
  if (!resume) throw new HttpError(404, 'Resume not found.');
  await prisma.$transaction([prisma.application.updateMany({ where: { resumeId: resume.id }, data: { resumeId: null } }), prisma.resume.delete({ where: { id: resume.id } })]);
  await removeFile(resume.storageKey).catch(() => undefined);
  res.status(204).end();
}));

export default router;
