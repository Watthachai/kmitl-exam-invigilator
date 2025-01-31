/*
  Warnings:

  - You are about to drop the column `scheduleOption` on the `Schedule` table. All the data in the column will be lost.
  - Added the required column `scheduleDateOption` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "scheduleOption",
ADD COLUMN     "scheduleDateOption" TEXT NOT NULL;
