-- CreateEnum
CREATE TYPE "HiringStageKind" AS ENUM ('RECRUITER_SCREEN', 'ONLINE_ASSESSMENT', 'TECHNICAL', 'SYSTEM_DESIGN', 'BEHAVIOURAL', 'HIRING_MANAGER', 'ONSITE', 'TEAM_MATCH', 'HR_DISCUSSION', 'OFFER', 'OTHER');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "archivedAt" TIMESTAMP(3),
                          ADD COLUMN "processStageId" TEXT;

-- CreateTable
CREATE TABLE "HiringProcessTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" VARCHAR(120) NOT NULL,
    "companyKey" VARCHAR(120) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HiringProcessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringProcessStage" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "HiringStageKind" NOT NULL DEFAULT 'OTHER',
    "position" INTEGER NOT NULL,
    "typicalDurationDays" INTEGER,
    "notes" TEXT,
    CONSTRAINT "HiringProcessStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_userId_archivedAt_idx" ON "Application"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "HiringProcessTemplate_userId_company_idx" ON "HiringProcessTemplate"("userId", "company");

-- CreateIndex
CREATE UNIQUE INDEX "HiringProcessTemplate_userId_companyKey_key" ON "HiringProcessTemplate"("userId", "companyKey");

-- CreateIndex
CREATE INDEX "HiringProcessStage_templateId_position_idx" ON "HiringProcessStage"("templateId", "position");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "HiringProcessStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringProcessTemplate" ADD CONSTRAINT "HiringProcessTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringProcessStage" ADD CONSTRAINT "HiringProcessStage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HiringProcessTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
