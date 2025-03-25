/*
  Warnings:

  - Added the required column `academicYear` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `examType` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `startTime` on the `Schedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `Schedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "academicYear" INTEGER NOT NULL,
ADD COLUMN     "examType" TEXT NOT NULL,
ADD COLUMN     "invigilatorPosition" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "semester" INTEGER NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_date_scheduleDateOption_startTime_endTime_roomId_s_key" ON "Schedule"("date", "scheduleDateOption", "startTime", "endTime", "roomId", "subjectGroupId");
