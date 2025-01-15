/*
  Warnings:

  - Added the required column `departmentId` to the `Professor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Professor" ADD COLUMN     "departmentId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Professor_departmentId_idx" ON "Professor"("departmentId");

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;
