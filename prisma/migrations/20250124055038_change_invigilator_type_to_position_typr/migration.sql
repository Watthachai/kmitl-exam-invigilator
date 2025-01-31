/*
  Warnings:

  - You are about to drop the column `type` on the `Invigilator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invigilator" DROP COLUMN "type",
ADD COLUMN     "positionType" TEXT NOT NULL DEFAULT 'INTERNAL';
