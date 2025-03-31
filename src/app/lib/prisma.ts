import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    // วิธีที่ถูกต้องในการกำหนดค่า connection pool
    datasourceUrl: `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=30`,
    // ตัวเลือกเพิ่มเติม
    transactionOptions: {
      maxWait: 5000,
      timeout: 10000,
    }
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;