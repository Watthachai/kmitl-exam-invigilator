/*
  Warnings:

  - A unique constraint covering the columns `[date,roomId,startTime,endTime,invigilatorPosition]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Schedule" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "invigilatorPosition" DROP NOT NULL,
ALTER COLUMN "invigilatorPosition" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_date_roomId_startTime_endTime_invigilatorPosition_key" ON "Schedule"("date", "roomId", "startTime", "endTime", "invigilatorPosition");
