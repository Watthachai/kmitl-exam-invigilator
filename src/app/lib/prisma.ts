import { PrismaClient } from '@prisma/client';

// ใช้ global variable เพื่อป้องกันการสร้าง connection ใหม่ทุกครั้งเมื่อ hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// สร้าง PrismaClient เพียงครั้งเดียว
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // กำหนดค่า connection pool
    // ถ้าทำบน schema.prisma ไม่ได้ให้ทำที่นี่
    // datasourceUrl อาจต้องเปลี่ยนเป็นตาม version ของ Prisma
  });

// ทำให้แน่ใจว่าใน development mode จะไม่มีการสร้าง connection ใหม่
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;