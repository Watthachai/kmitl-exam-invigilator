import { PrismaClient, Prisma } from '@prisma/client';
import prisma from './prisma';

export async function logActivity(
  type: string,
  description: string,
  prismaClient: PrismaClient | Prisma.TransactionClient = prisma,
  userId?: string | null
) {
  try {
    // สร้าง data object ก่อน เพื่อตรวจสอบ
    const data: { type: string; description: string; createdAt: Date; userId?: string } = {
      type,
      description,
      createdAt: new Date()
    };
    
    // เพิ่ม userId เฉพาะเมื่อ userId มีค่าและไม่ใช่ string ว่าง
    if (userId) {
      data.userId = userId;
    }
    
    return await prismaClient.activity.create({ data });
  } catch (error) {
    // Log error แต่ไม่ throw เพื่อให้ process หลักทำงานต่อได้
    console.error('Failed to log activity:', error);
    return null;
  }
}