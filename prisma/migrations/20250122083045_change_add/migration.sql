/*
  Warnings:

  - The primary key for the `SubjectGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `SubjectGroupID` on the `SubjectGroup` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SubjectGroup` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SubjectGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Professor` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `SubjectGroup` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_subjectGroupId_fkey";

-- AlterTable
ALTER TABLE "SubjectGroup" DROP CONSTRAINT "SubjectGroup_pkey",
DROP COLUMN "SubjectGroupID",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "SubjectGroup_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "SubjectGroupProfessor" (
    "id" TEXT NOT NULL,
    "subjectGroupId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "SubjectGroupProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectGroupProfessor_subjectGroupId_idx" ON "SubjectGroupProfessor"("subjectGroupId");

-- CreateIndex
CREATE INDEX "SubjectGroupProfessor_professorId_idx" ON "SubjectGroupProfessor"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectGroupProfessor_subjectGroupId_professorId_key" ON "SubjectGroupProfessor"("subjectGroupId", "professorId");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_name_key" ON "Professor"("name");

-- CreateIndex
CREATE INDEX "SubjectGroup_subjectId_idx" ON "SubjectGroup"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectGroup_professorId_idx" ON "SubjectGroup"("professorId");

-- AddForeignKey
ALTER TABLE "SubjectGroupProfessor" ADD CONSTRAINT "SubjectGroupProfessor_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroupProfessor" ADD CONSTRAINT "SubjectGroupProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("ProfessorID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
