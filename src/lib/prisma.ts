import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Priority: process.env.DATABASE_URL -> 188.132.198.144 (VPS public IP where PostgreSQL port 5432 is published)
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:RMSv3_Local_Password_2026!@188.132.198.144:5432/prjrms_db?schema=public';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
