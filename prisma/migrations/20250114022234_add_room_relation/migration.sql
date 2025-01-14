/*
  Warnings:

  - You are about to drop the column `building` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `roomNumber` on the `Schedule` table. All the data in the column will be lost.
  - Added the required column `roomId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "building",
DROP COLUMN "roomNumber",
ADD COLUMN     "roomId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Room" (
    "RoomID" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("RoomID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_building_roomNumber_key" ON "Room"("building", "roomNumber");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("RoomID") ON DELETE RESTRICT ON UPDATE CASCADE;
