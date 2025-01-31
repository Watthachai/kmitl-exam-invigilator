/*
  Warnings:

  - You are about to drop the column `positionType` on the `Invigilator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invigilator" DROP COLUMN "positionType",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INTERNAL';
