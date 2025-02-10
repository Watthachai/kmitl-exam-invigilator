/*
  Warnings:

  - You are about to drop the `revoked_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "revoked_tokens" DROP CONSTRAINT "revoked_tokens_userId_fkey";

-- DropTable
DROP TABLE "revoked_tokens";
