import prisma from './prisma';
import { getServerSession } from 'next-auth';

export async function logActivity(
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN',
  description: string,
  prismaClient = prisma
) {
  const session = await getServerSession();
  
  return prismaClient.activity.create({
    data: {
      type,
      description,
      userId: session?.user?.id
    }
  });
}