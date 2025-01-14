-- AlterTable
ALTER TABLE "Schedule" ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "startTime" SET DATA TYPE TIME,
ALTER COLUMN "endTime" SET DATA TYPE TIME;

-- CreateIndex
CREATE INDEX "Schedule_roomId_idx" ON "Schedule"("roomId");

-- CreateIndex
CREATE INDEX "Schedule_subjectGroupId_idx" ON "Schedule"("subjectGroupId");

-- CreateIndex
CREATE INDEX "Schedule_invigilatorId_idx" ON "Schedule"("invigilatorId");
