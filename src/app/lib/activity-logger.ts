import prisma from './prisma';
import { Prisma } from '@prisma/client';

export async function logActivity(
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN',
  description: string,
  prismaClient: Prisma.TransactionClient = prisma,
  userId?: string | null
) {
  return prismaClient.activity.create({
    data: {
      type,
      description,
      ...(userId && { userId })
    }
  });
}