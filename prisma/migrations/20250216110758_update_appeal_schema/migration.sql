/*
  Warnings:

  - You are about to drop the column `notes` on the `Appeal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appeal" DROP COLUMN "notes",
ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "adminResponse" TEXT;
