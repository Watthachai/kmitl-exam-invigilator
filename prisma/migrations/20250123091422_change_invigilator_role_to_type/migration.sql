/*
  Warnings:

  - The `type` column on the `Invigilator` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InvigilatorType" AS ENUM ('INTERNAL', 'MANAGER', 'PROFESSOR', 'HEAD_PROFESSOR');

-- AlterTable
ALTER TABLE "Invigilator" DROP COLUMN "type",
ADD COLUMN     "type" "InvigilatorType" NOT NULL DEFAULT 'INTERNAL';
