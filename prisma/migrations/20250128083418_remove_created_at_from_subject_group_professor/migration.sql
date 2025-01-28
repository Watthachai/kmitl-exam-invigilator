/*
  Warnings:

  - A unique constraint covering the columns `[subjectId,groupNumber,year]` on the table `SubjectGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SubjectGroupProfessor_professorId_idx";

-- DropIndex
DROP INDEX "SubjectGroupProfessor_subjectGroupId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "SubjectGroup_subjectId_groupNumber_year_key" ON "SubjectGroup"("subjectId", "groupNumber", "year");
