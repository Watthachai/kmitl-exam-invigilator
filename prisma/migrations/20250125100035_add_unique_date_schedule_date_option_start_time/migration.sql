/*
  Warnings:

  - A unique constraint covering the columns `[date,scheduleDateOption,startTime,endTime,roomId,subjectGroupId]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Schedule_date_scheduleDateOption_startTime_endTime_roomId_s_key" ON "Schedule"("date", "scheduleDateOption", "startTime", "endTime", "roomId", "subjectGroupId");
