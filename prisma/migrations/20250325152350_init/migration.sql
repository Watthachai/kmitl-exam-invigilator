-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "staffPreferred" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "isGenEd" BOOLEAN NOT NULL DEFAULT false;
