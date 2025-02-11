import { PrismaClient, Prisma } from '@prisma/client';
import prisma from './prisma';

export async function logActivity(
  type: string,
  description: string,
  prismaClient: PrismaClient | Prisma.TransactionClient = prisma,
  userId?: string
) {
  return await prismaClient.activity.create({
    data: {
      type,
      description,
      createdAt: new Date(),
      ...(userId && { userId })
    }
  });
}