/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[professorId]` on the table `Invigilator` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Made the column `departmentId` on table `Invigilator` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Invigilator" DROP CONSTRAINT "Invigilator_departmentId_fkey";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invigilator" ALTER COLUMN "departmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Invigilator_professorId_key" ON "Invigilator"("professorId");

-- AddForeignKey
ALTER TABLE "Invigilator" ADD CONSTRAINT "Invigilator_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;
