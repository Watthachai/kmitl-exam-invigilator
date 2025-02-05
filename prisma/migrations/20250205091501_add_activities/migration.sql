-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_invigilatorId_fkey";

-- AlterTable
ALTER TABLE "Schedule" ALTER COLUMN "invigilatorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "Invigilator"("InvigilatorID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;
