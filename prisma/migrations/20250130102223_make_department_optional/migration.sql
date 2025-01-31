-- AlterTable
ALTER TABLE "Invigilator" ADD COLUMN     "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "Invigilator" ADD CONSTRAINT "Invigilator_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE SET NULL ON UPDATE CASCADE;
