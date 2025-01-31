/*
  Warnings:

  - The `type` column on the `Invigilator` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Invigilator" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INTERNAL';

-- DropEnum
DROP TYPE "InvigilatorType";
